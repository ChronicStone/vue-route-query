/**
 * Codecs: one URL value each, with its format, its rules, its default, and how it writes.
 *
 * - Each factory owns one URL format and its built-in rules (`min`, `max`, `int`, lengths...).
 * - `validate: (value) => boolean` adds a one-off rule.
 * - `schemaCodec(standardSchema)` is the only place a validation library enters: a
 *   structured value in one key, written as JSON or in a custom `format`. The Standard Schema
 *   import is type-only, so no validation library is part of the runtime.
 */
import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { HistoryMode } from './client'
import { isDev } from './env'

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/** Why a URL value was not used, or was only partly used. */
export interface QueryIssue {
  /**
   * - `format`: not a number, a date, a list member, or JSON, or a custom parse threw.
   * - `option`: a built-in option rejected it (`min`, `int`, `maxLength`...).
   * - `validate`: the codec's `validate` returned `false`, or `schemaCodec`'s schema reported issues.
   * - `group`: a `useQueryStates` rule rejected it.
   */
  reason: 'format' | 'option' | 'validate' | 'group'
  message: string
  /** The group rule name, when `reason` is `'group'`. */
  rule?: string
}

/**
 * Result of reading one raw URL value.
 *
 * An accepted value may still carry an `issue`, for example a list that dropped an
 * invalid item with `invalidItems: 'drop'`.
 */
export type ParseResult<T> =
  | { ok: true; value: T; issue?: QueryIssue }
  | { ok: false; issue: QueryIssue }

/**
 * One URL value: format, rules, default, and write behavior.
 *
 * `TValue` is what `parse` returns; `TState` is what a bound ref holds (`TValue` with a
 * default, `TValue | undefined` without one).
 */
export interface QueryCodec<TValue, TState = TValue | undefined> {
  /** Reads a raw string. Never throws. */
  readonly parse: (raw: string) => ParseResult<TValue>
  /** Writes a value. `null` removes the key. */
  readonly serialize: (value: TValue) => string | null
  readonly defaultValue: TState
  readonly historyMode: HistoryMode | undefined
  /** Removes the key when the value serializes like the default. */
  readonly omitDefault: boolean
  /** Phantom: carries the ref type for inference. */
  readonly '~state'?: TState
}

/**
 * Any codec, as a constraint. Not `QueryCodec<any, any>`: a codec type in a constraint
 * becomes the contextual return type of a factory call and leaks into its generics.
 */
export interface AnyQueryCodec {
  readonly parse: (raw: string) => ParseResult<unknown>
  // `never` accepts every codec's serialize, whatever its value type.
  readonly serialize: (value: never) => string | null
  readonly defaultValue: unknown
  readonly historyMode: HistoryMode | undefined
  readonly omitDefault: boolean
  readonly '~state'?: unknown
}

/** The ref type a codec produces. */
export type InferCodecState<C> = C extends QueryCodec<infer _V, infer S> ? S : never

/** Options every codec takes, built-in or custom. */
export interface CodecOptions<T> {
  /** Used when the key is missing or rejected. Set: the ref is `T`. Left out: `T | undefined`. */
  default?: T
  /** A one-off rule on the parsed value, run after the built-in options. Return `false` to reject. */
  validate?: (value: T) => boolean
  /** Whether a write from this value adds a history entry. Defaults to the client's mode. */
  historyMode?: HistoryMode
  /** Remove the key when the value serializes like the default. Defaults to `true`. */
  omitDefault?: boolean
}

/** The ref type: `T` when `default` is set, `T | undefined` otherwise. */
export type StateFromOptions<T, O> = O extends { default: infer D }
  ? undefined extends D
    ? T | undefined
    : T
  : T | undefined

/** A URL format: how one value is read from and written to a string. */
export interface QueryFormat<T> {
  parse: (raw: string) => ParseResult<T>
  serialize: (value: T) => string | null
}

type Rule<T> = (value: T) => ParseResult<T>

const ok = <T>(value: T, issue?: QueryIssue): ParseResult<T> =>
  issue ? { ok: true, value, issue } : { ok: true, value }

const reject = (reason: QueryIssue['reason'], message: string): ParseResult<never> => ({
  ok: false,
  issue: { reason, message },
})

function build<T, O extends CodecOptions<T>>(
  format: QueryFormat<T>,
  rules: Rule<T>[],
  options: O | undefined,
): QueryCodec<T, StateFromOptions<T, O>> {
  const validate = options?.validate
  const allRules = validate
    ? [
        ...rules,
        (value: T) => (validate(value) ? ok(value) : reject('validate', 'rejected by validate')),
      ]
    : rules

  const codec: QueryCodec<T, StateFromOptions<T, O>> = {
    parse(raw) {
      try {
        let result = format.parse(raw)
        const carried = result.ok ? result.issue : undefined
        for (const rule of allRules) {
          if (!result.ok) {
            return result
          }
          result = rule(result.value)
        }
        return result.ok && carried && !result.issue ? ok(result.value, carried) : result
      } catch (error) {
        // A custom parse or validate that throws is a rejection, never a crash.
        return reject('format', `threw: ${String(error)}`)
      }
    },
    serialize: format.serialize,
    // SAFETY: StateFromOptions is T when `default` is set, T | undefined otherwise.
    defaultValue: options?.default as StateFromOptions<T, O>,
    historyMode: options?.historyMode,
    omitDefault: options?.omitDefault ?? true,
  }

  // A default that breaks its own codec's rules can never be written or read back.
  if (isDev && options?.default !== undefined) {
    let check: ParseResult<T> | undefined
    try {
      const raw = format.serialize(options.default)
      check = raw === null ? undefined : codec.parse(raw)
    } catch (error) {
      check = reject('format', `threw: ${String(error)}`)
    }
    if (check && !check.ok) {
      console.warn(
        `[vue-route-query] a codec's default ${JSON.stringify(options.default)} breaks its own rules: ${check.issue.message}`,
      )
    }
  }

  return codec
}

/** Shared by numbers and dates: `'clamp'` corrects the value instead of rejecting it. */
function range<T extends number | Date>(
  min: T | undefined,
  max: T | undefined,
  outOfRange: 'reject' | 'clamp' = 'reject',
): Rule<T> {
  const label = (bound: T) => (bound instanceof Date ? bound.toISOString() : String(bound))
  return (value) => {
    if (min !== undefined && value < min) {
      return outOfRange === 'clamp' ? ok(min) : reject('option', `below the minimum ${label(min)}`)
    }
    if (max !== undefined && value > max) {
      return outOfRange === 'clamp' ? ok(max) : reject('option', `above the maximum ${label(max)}`)
    }
    return ok(value)
  }
}

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

export interface StringOptions extends CodecOptions<string> {
  /** Trim whitespace when reading. */
  trim?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

/** Any string. */
export function stringCodec<const O extends StringOptions>(options?: O) {
  const rules: Rule<string>[] = [
    (value) => ok(options?.trim ? value.trim() : value),
    (value) =>
      value.length < (options?.minLength ?? 0)
        ? reject('option', `shorter than ${options?.minLength} characters`)
        : ok(value),
    (value) =>
      value.length > (options?.maxLength ?? Number.POSITIVE_INFINITY)
        ? reject('option', `longer than ${options?.maxLength} characters`)
        : ok(value),
    (value) => {
      const pattern = options?.pattern
      if (!pattern) {
        return ok(value)
      }
      // A global or sticky pattern keeps state between calls; start each test from 0.
      pattern.lastIndex = 0
      return pattern.test(value) ? ok(value) : reject('option', `does not match ${pattern}`)
    },
  ]
  return build<string, O>({ parse: (raw) => ok(raw), serialize: (value) => value }, rules, options)
}

export interface NumberOptions extends CodecOptions<number> {
  /** Reject numbers that are not integers. */
  int?: boolean
  min?: number
  max?: number
  /** What a value outside `min` and `max` does. Defaults to `'reject'`. */
  outOfRange?: 'reject' | 'clamp'
}

/** Finite numbers. `?page=abc`, `?page=` and `?page=Infinity` are rejected. */
export function numberCodec<const O extends NumberOptions>(options?: O) {
  const rules: Rule<number>[] = [
    (value) =>
      options?.int && !Number.isInteger(value) ? reject('option', 'not an integer') : ok(value),
    range(options?.min, options?.max, options?.outOfRange),
  ]
  return build<number, O>(
    {
      parse(raw) {
        const value = raw.trim() === '' ? Number.NaN : Number(raw)
        return Number.isFinite(value) ? ok(value) : reject('format', `"${raw}" is not a number`)
      },
      serialize: (value) => String(value),
    },
    rules,
    options,
  )
}

/** `true` or `false`. Anything else is rejected. */
export function booleanCodec<const O extends CodecOptions<boolean>>(options?: O) {
  return build<boolean, O>(
    {
      parse: (raw) =>
        raw === 'true'
          ? ok(true)
          : raw === 'false'
            ? ok(false)
            : reject('format', `"${raw}" is not true or false`),
      serialize: (value) => String(value),
    },
    [],
    options,
  )
}

/** A closed list of strings, kept as a literal union. */
export function enumCodec<
  const L extends readonly string[],
  const O extends CodecOptions<L[number]>,
>(values: L, options?: O) {
  const allowed = new Set<string>(values)
  return build<L[number], O>(
    {
      parse: (raw) =>
        // SAFETY: the set was built from `values`, so a member is one of L[number].
        allowed.has(raw)
          ? ok(raw as L[number])
          : reject('format', `"${raw}" is not one of ${values.join(', ')}`),
      serialize: (value) => value,
    },
    [],
    options,
  )
}

export interface DateOptions extends CodecOptions<Date> {
  /**
   * What the URL holds. Required, because it decides the link format.
   * - `'date'`: `2024-01-31`, read as UTC midnight. For calendar filters.
   * - `'datetime'`: a full ISO timestamp.
   */
  format: 'date' | 'datetime'
  min?: Date
  max?: Date
  /** What a date outside `min` and `max` does. Defaults to `'reject'`. */
  outOfRange?: 'reject' | 'clamp'
}

/** Dates, as `YYYY-MM-DD` or as a full ISO timestamp. */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
// A timezone is required, so the server and the browser read the same instant.
const DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/

/** Whether year, month, and day name a real calendar day (no 2024-02-30). */
function isCalendarDay(year: string, month: string, day: string): boolean {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  )
}

export function dateCodec<const O extends DateOptions>(options: O) {
  const { format } = options
  return build<Date, O>(
    {
      parse(raw) {
        const parts = (format === 'date' ? DATE_PATTERN : DATETIME_PATTERN).exec(raw)
        if (!parts) {
          return reject(
            'format',
            format === 'date'
              ? `"${raw}" is not a YYYY-MM-DD date`
              : `"${raw}" is not an ISO timestamp with a timezone`,
          )
        }
        const [, year = '', month = '', day = ''] = parts
        const value = new Date(format === 'date' ? `${raw}T00:00:00.000Z` : raw)
        return isCalendarDay(year, month, day) && !Number.isNaN(value.getTime())
          ? ok(value)
          : reject('format', `"${raw}" is not a real date`)
      },
      serialize: (value) =>
        format === 'date' ? value.toISOString().slice(0, 10) : value.toISOString(),
    },
    [range<Date>(options.min, options.max, options.outOfRange)],
    options,
  )
}

// ---------------------------------------------------------------------------
// Lists and objects
// ---------------------------------------------------------------------------

export interface ArrayOptions<T> extends CodecOptions<T[]> {
  /** Defaults to `,`. */
  separator?: string
  minItems?: number
  maxItems?: number
  /** Remove repeated items when reading. */
  unique?: boolean
  /**
   * What one invalid item does (`?status=open,bogus`):
   * - `'reject'` (default): the whole list is rejected and the default applies.
   * - `'drop'`: invalid items are removed and the rest is kept. The drop is reported in `issues`.
   */
  invalidItems?: 'reject' | 'drop'
}

/**
 * A separator-delimited list. Each item goes through `item` (its format, options and
 * `validate`); the item codec's `default` and write options are not used.
 */
export function arrayCodec<T, const O extends ArrayOptions<T>>(
  item: QueryCodec<T, unknown>,
  options?: O,
) {
  const separator = options?.separator ?? ','
  const invalidItems = options?.invalidItems ?? 'reject'
  const encodedSeparator = encodeURIComponent(separator)
  // Items may contain the separator: escape `%` first, then the separator, and undo both in
  // the reverse order when reading.
  const escapeItem = (text: string) =>
    text.replaceAll('%', '%25').replaceAll(separator, encodedSeparator)
  const unescapeItem = (text: string) =>
    text.replaceAll(encodedSeparator, separator).replaceAll('%25', '%')
  const rules: Rule<T[]>[] = [
    (value) => ok(options?.unique ? [...new Set(value)] : value),
    (value) =>
      value.length < (options?.minItems ?? 0)
        ? reject('option', `fewer than ${options?.minItems} items`)
        : ok(value),
    (value) =>
      value.length > (options?.maxItems ?? Number.POSITIVE_INFINITY)
        ? reject('option', `more than ${options?.maxItems} items`)
        : ok(value),
  ]
  return build<T[], O>(
    {
      parse(raw) {
        if (raw === '') {
          return ok([])
        }
        const values: T[] = []
        const dropped: string[] = []
        for (const part of raw.split(separator).map(unescapeItem)) {
          const result = item.parse(part)
          if (result.ok) {
            values.push(result.value)
          } else if (invalidItems === 'reject') {
            return reject(result.issue.reason, `item "${part}": ${result.issue.message}`)
          } else {
            dropped.push(part)
          }
        }
        return dropped.length
          ? ok(values, {
              reason: 'format',
              message: `dropped invalid ${dropped.length === 1 ? 'item' : 'items'} ${dropped
                .map((part) => `"${part}"`)
                .join(', ')}`,
            })
          : ok(values)
      },
      // An empty list writes an empty value, so it survives a non-empty default. With an
      // empty default, `omitDefault` removes the key.
      serialize: (value) =>
        value.map((entry) => escapeItem(item.serialize(entry) ?? '')).join(separator),
    },
    rules,
    options,
  )
}

/** JSON with object keys sorted, so equal values always write the same string. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : entry,
  )
}

export interface SchemaCodecOptions<T> extends Omit<CodecOptions<T>, 'validate'> {
  /**
   * How the value is written in the URL. Defaults to JSON with sorted keys.
   * `parse` turns the raw string into the schema's input, and the schema still checks it;
   * `serialize` writes the value, or returns `null` to remove the key.
   */
  format?: {
    parse: (raw: string) => unknown
    serialize: (value: T) => string | null
  }
}

/**
 * A structured value in one key, typed and checked by any Standard Schema library (Zod,
 * Valibot, ArkType...). The schema is the rule, so there is no `validate`. The URL format is
 * JSON unless `format` says otherwise. Synchronous schemas only.
 */
export function schemaCodec<
  S extends StandardSchemaV1,
  const O extends SchemaCodecOptions<StandardSchemaV1.InferOutput<S>>,
>(schema: S, options?: O) {
  type T = StandardSchemaV1.InferOutput<S>
  const format = options?.format
  return build<T, O>(
    {
      parse(raw) {
        let input: unknown
        try {
          input = format ? format.parse(raw) : JSON.parse(raw)
        } catch (error) {
          return reject('format', format ? `threw: ${String(error)}` : 'not valid JSON')
        }
        const result = schema['~standard'].validate(input)
        if (result instanceof Promise) {
          return reject(
            'validate',
            `async schemas are not supported (${schema['~standard'].vendor})`,
          )
        }
        // SAFETY: a Standard Schema result without issues carries the schema output.
        return result.issues
          ? reject('validate', result.issues[0]?.message ?? 'rejected by the schema')
          : ok(result.value as T)
      },
      serialize: (value) => (format ? format.serialize(value) : stableStringify(value)),
    },
    [],
    options,
  )
}

/**
 * Turns a custom format into a codec factory that takes the same options as the
 * built-in ones (`default`, `validate`, `historyMode`, `omitDefault`).
 */
export function defineCodec<T>(format: QueryFormat<T>) {
  return <const O extends CodecOptions<T>>(options?: O) => build<T, O>(format, [], options)
}
