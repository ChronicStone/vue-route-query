/**
 * Vue composables for URL query state management.
 *
 * - useQueryState: one key, one typed ref
 * - useQueryStates: several keys, one typed object, written in one navigation
 * - dynamicQueryState: a schema entry whose keys come from runtime definitions
 *
 * All backed by QueryStateClient for cache + microtask batching.
 * Uses shallowRef internally to avoid deep reactive proxying.
 */

import { computed, onScopeDispose, shallowRef } from 'vue'
import type { WritableComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Router } from 'vue-router'

import { QueryStateClient } from './client'
import type { HistoryMode } from './client'
import type { AnyQueryCodec, InferCodecState, QueryCodec, QueryIssue } from './codecs'
import { hasProperty, isNullish, isObject } from './predicates'

// ---------------------------------------------------------------------------
// Client registry
// ---------------------------------------------------------------------------

interface RegisteredClient {
  client: QueryStateClient
  /** Removes the router hook that keeps this client in step with the route. */
  stopRouteSync: () => void
}

const clientRegistry = new WeakMap<Router, RegisteredClient>()

/**
 * Pre-register a query-state client for a router instance.
 *
 * This is useful from app plugins when you want one shared client instance with
 * custom defaults or devtools wiring before composables run. The client is kept
 * in step with the route from then on, so back/forward and outside navigations
 * reach every query-state consumer.
 *
 * @example
 * ```ts
 * const client = new QueryStateClient({ router, defaultHistoryMode: 'replace' })
 * registerQueryStateClient(router, client)
 * ```
 */
export function registerQueryStateClient(router: Router, client: QueryStateClient): void {
  clientRegistry.get(router)?.stopRouteSync()
  clientRegistry.set(router, {
    client,
    stopRouteSync: router.afterEach(() => {
      client.syncFromRoute()
    }),
  })
}

/**
 * Returns the shared query-state client for the current router.
 *
 * If no client has been registered yet, this lazily creates one and wires route
 * synchronization so external navigations update active query-state consumers.
 *
 * @example
 * ```ts
 * const client = useQueryStateClient({ defaultHistoryMode: 'push' })
 * client.set('page', '2')
 * ```
 */
export function useQueryStateClient(options?: {
  /** History mode used by the lazily created client when individual writes omit one. */
  defaultHistoryMode?: HistoryMode
}): QueryStateClient {
  const router = useRouter()

  const registered = clientRegistry.get(router)
  if (registered) {
    return registered.client
  }

  const client = new QueryStateClient({
    defaultHistoryMode: options?.defaultHistoryMode,
    router,
  })
  registerQueryStateClient(router, client)

  return client
}

// ---------------------------------------------------------------------------
// Shared read / write through a codec
// ---------------------------------------------------------------------------

// SAFETY: every public entry point accepts only codecs built by the factories, which all
// satisfy this shape; the loose view is only used inside this module.
type LooseCodec = QueryCodec<unknown, unknown>

const asLoose = (codec: unknown) => codec as LooseCodec

/** Reads one key through its codec, recording why a value was not used. */
function readKey(client: QueryStateClient, urlKey: string, codec: LooseCodec): unknown {
  const raw = client.get(urlKey)
  if (isNullish(raw)) {
    client.clearIssue(urlKey)
    return codec.defaultValue
  }
  const result = codec.parse(raw)
  if (!result.ok) {
    client.reportIssue(urlKey, raw, result.issue)
    return codec.defaultValue
  }
  if (result.issue) {
    client.reportIssue(urlKey, raw, result.issue, true)
  } else {
    client.clearIssue(urlKey)
  }
  return result.value
}

/**
 * Normalizes a written value through the codec, so the ref never holds a value the URL
 * would reject: `page.value = 0` with `min: 1` stores the default, and a clamping codec
 * stores the clamped value.
 */
function normalizeWrite(codec: LooseCodec, value: unknown): { value: unknown; raw: string | null } {
  // `null` and `undefined` both clear the value: the ref falls back to the default.
  if (isNullish(value)) {
    return { value: codec.defaultValue, raw: null }
  }
  try {
    const serialized = codec.serialize(value)
    if (isNullish(serialized)) {
      return { value, raw: null }
    }
    const result = codec.parse(serialized)
    if (!result.ok) {
      return { value: codec.defaultValue, raw: null }
    }
    return { value: result.value, raw: codec.serialize(result.value) }
  } catch {
    // A value the codec cannot write, such as an invalid Date, is treated like a rejection.
    return { value: codec.defaultValue, raw: null }
  }
}

/** The raw value to write, or `null` when it equals the default and defaults are omitted. */
function rawToWrite(codec: LooseCodec, raw: string | null): string | null {
  if (isNullish(raw)) {
    return null
  }
  if (codec.omitDefault && codec.defaultValue !== undefined) {
    if (raw === codec.serialize(codec.defaultValue)) {
      return null
    }
  }
  return raw
}

// ---------------------------------------------------------------------------
// useQueryState — one key
// ---------------------------------------------------------------------------

/**
 * Binds one query-string key to a writable computed ref, typed by its codec.
 *
 * Reads come from the shared client cache. Writes are normalized through the codec,
 * then batched with every other write of the tick into one navigation.
 *
 * @example
 * ```ts
 * const page = useQueryState('page', numberCodec({ default: 1, int: true, min: 1 }))
 * page.value++ // ?page=2
 * ```
 */
export function useQueryState<C extends AnyQueryCodec>(
  key: string,
  codec: C,
): WritableComputedRef<InferCodecState<C>> {
  const client = useQueryStateClient()
  const loose = asLoose(codec)

  const internal = shallowRef(readKey(client, key, loose))

  const unsubscribe = client.subscribe((changedKey) => {
    if (changedKey === key) {
      internal.value = readKey(client, key, loose)
    }
  })
  onScopeDispose(unsubscribe)

  return computed({
    // SAFETY: the value comes from this codec's parse or default, which is its state type.
    get: () => internal.value as InferCodecState<C>,
    set: (value) => {
      const normalized = normalizeWrite(loose, value)
      internal.value = normalized.value
      client.clearIssue(key)
      client.set(key, rawToWrite(loose, normalized.raw), loose.historyMode)
    },
  })
}

// ---------------------------------------------------------------------------
// dynamicQueryState — keys from runtime definitions
// ---------------------------------------------------------------------------

const DYNAMIC_MARKER = Symbol('dynamicQueryState')

/**
 * A grouped entry whose URL keys come from runtime definitions, such as the filters a
 * user configured. The property type stays stable; the keys behind it change with the data.
 */
export interface DynamicQueryStateOptions<TDefinition, TValue> {
  /** Prefix of every key this entry owns, after the group's `prefix`. */
  urlPrefix: string
  /** The definitions that exist right now. Read on every group read and write. */
  definitions: () => TDefinition[]
  /**
   * Every key one definition may use, with the codec that reads and writes it.
   * The codec's `default` and write options are not used here.
   */
  resolve: (definition: TDefinition) => { urlKey: string; codec: AnyQueryCodec }[]
  /** Builds the value from the entries present in the URL and accepted by their codec. */
  parse: (entries: ReadonlyMap<string, unknown>, definitions: TDefinition[]) => TValue
  /** Maps the value back to URL entries. Keys it leaves out are removed. */
  serialize: (value: TValue, definitions: TDefinition[]) => Map<string, unknown>
  /** The value when no resolved key is present. */
  default: TValue
}

export interface DynamicQueryStateDef<TValue> {
  readonly [DYNAMIC_MARKER]: true
  // oxlint-disable-next-line no-explicit-any -- the definition type is erased once in a schema
  readonly options: DynamicQueryStateOptions<any, TValue>
}

/**
 * Declares a `useQueryStates` entry whose keys come from runtime definitions.
 *
 * @example
 * ```ts
 * fields: dynamicQueryState({
 *   urlPrefix: 'fields',
 *   definitions: () => columns.value,
 *   resolve: (column) => [{ urlKey: column.key, codec: stringCodec() }],
 *   parse: (entries) => Object.fromEntries(entries),
 *   serialize: (value) => new Map(Object.entries(value)),
 *   default: {},
 * })
 * ```
 */
export function dynamicQueryState<TDefinition, TValue>(
  options: DynamicQueryStateOptions<TDefinition, TValue>,
): DynamicQueryStateDef<TValue> {
  return { [DYNAMIC_MARKER]: true, options }
}

function isDynamicEntry(value: unknown): value is DynamicQueryStateDef<unknown> {
  return isObject(value) && hasProperty(value, DYNAMIC_MARKER)
}

// ---------------------------------------------------------------------------
// useQueryStates — several keys, one object
// ---------------------------------------------------------------------------

// The dynamic side matches on the marker only: `DynamicQueryStateDef<unknown>` would reject
// concrete value types through the contravariant `serialize` parameter.
type SchemaEntry = AnyQueryCodec | { readonly [DYNAMIC_MARKER]: true }

type EntryState<E> = E extends DynamicQueryStateDef<infer V> ? V : InferCodecState<E>

/** Checked after inference, so factory generics are inferred from their own arguments. */
type ValidSchema<S> = { [K in keyof S]: S[K] extends SchemaEntry ? S[K] : SchemaEntry }

/** The value of a `useQueryStates` schema. */
export type QueryStatesValue<S> = { [K in keyof S]: EntryState<S[K]> }

/** Values of the named keys, without `undefined`: a rule only runs when all of them are set. */
type DefinedValues<V, K extends keyof V> = { [P in K]: Exclude<V[P], undefined> }

/**
 * Cross-field rules, keyed by a name shown in `issues`. They run when the URL is read
 * (page load, reload, Back, a shared link), not when the app writes.
 */
export type QueryStatesRules<V, RK extends Record<string, readonly (keyof V)[]>> = {
  [R in keyof RK]: {
    /** Keys the rule reads. The rule is skipped while any of them is `undefined`. */
    keys: RK[R]
    /** Return `false` to reject. Values are typed and never `undefined`. */
    check: (values: DefinedValues<V, RK[R][number]>) => boolean
    /** Keys that fall back to their default when the check fails. Must be among `keys`. */
    reject: readonly RK[R][number][]
    /** Shown in `issues` and in the development warning. */
    message?: string
  }
}

export interface UseQueryStatesOptions<
  S extends Record<string, object>,
  RK extends Record<string, readonly (keyof S)[]>,
> {
  /** Prepended to every key as `prefix.key`. */
  prefix?: string
  /** One entry per property: a codec, or a `dynamicQueryState(...)`. */
  schema: S & ValidSchema<S>
  /** URL keys that differ from the property names: `{ pageSize: 'size' }`. */
  urlKeys?: { [K in keyof S]?: string }
  /** History mode for writes from this group. A codec's own `historyMode` wins for its key. */
  historyMode?: HistoryMode
  /** Cross-field rules, checked when the URL is read. */
  rules?: QueryStatesRules<QueryStatesValue<S>, RK>
}

interface LooseRule {
  keys: readonly string[]
  check: (values: Record<string, unknown>) => boolean
  reject: readonly string[]
  message?: string
}

/**
 * Binds several keys to one writable object. Assigning a new object writes every key in
 * one navigation.
 *
 * @example
 * ```ts
 * const table = useQueryStates({
 *   prefix: 'users',
 *   schema: {
 *     page: numberCodec({ default: 1, int: true, min: 1 }),
 *     pageSize: numberCodec({ default: 20, min: 10, max: 100, outOfRange: 'clamp' }),
 *   },
 *   urlKeys: { pageSize: 'size' },
 * })
 * ```
 */
export function useQueryStates<
  // `object`, not `SchemaEntry`: a codec type here would become the contextual return
  // type of every factory call in the schema literal and erase its inferred generics.
  S extends Record<string, object>,
  const RK extends Record<string, readonly (keyof S)[]> = {},
>(
  options: UseQueryStatesOptions<S, RK>,
): WritableComputedRef<{ [K in keyof S]: EntryState<S[K]> }> {
  type Value = QueryStatesValue<S>
  const client = useQueryStateClient()
  const { prefix, historyMode } = options
  // SAFETY: ValidSchema only narrows S for the type checker; at runtime it is the schema.
  const schema = options.schema as Record<string, SchemaEntry>
  // SAFETY: the rule types are fully checked at the call site; at runtime they are plain functions.
  const rules = Object.entries((options.rules ?? {}) as Record<string, LooseRule>)
  const urlKeys = (options.urlKeys ?? {}) as Record<string, string | undefined>

  const withPrefix = (key: string) => (prefix ? `${prefix}.${key}` : key)

  const staticKeys = new Map<string, { urlKey: string; codec: LooseCodec }>()
  const dynamicKeys = new Map<string, { fullPrefix: string; def: DynamicQueryStateDef<unknown> }>()

  for (const [property, entry] of Object.entries(schema)) {
    if (isDynamicEntry(entry)) {
      dynamicKeys.set(property, { fullPrefix: withPrefix(entry.options.urlPrefix), def: entry })
    } else {
      staticKeys.set(property, {
        urlKey: withPrefix(urlKeys[property] ?? property),
        codec: asLoose(entry),
      })
    }
  }

  // --- Dynamic entries ---

  function readDynamic(fullPrefix: string, def: DynamicQueryStateDef<unknown>): unknown {
    const { options: dynamic } = def
    const definitions = dynamic.definitions()
    const entries = new Map<string, unknown>()

    for (const definition of definitions) {
      for (const { urlKey, codec } of dynamic.resolve(definition)) {
        const fullKey = `${fullPrefix}.${urlKey}`
        const raw = client.get(fullKey)
        if (isNullish(raw) || raw === '') {
          client.clearIssue(fullKey)
          continue
        }
        const result = asLoose(codec).parse(raw)
        if (!result.ok) {
          client.reportIssue(fullKey, raw, result.issue)
          continue
        }
        if (result.issue) {
          client.reportIssue(fullKey, raw, result.issue, true)
        } else {
          client.clearIssue(fullKey)
        }
        entries.set(urlKey, result.value)
      }
    }

    return entries.size ? dynamic.parse(entries, definitions) : dynamic.default
  }

  function writeDynamic(
    fullPrefix: string,
    def: DynamicQueryStateDef<unknown>,
    value: unknown,
  ): { key: string; value: string | null }[] {
    const { options: dynamic } = def
    const definitions = dynamic.definitions()
    const codecs = new Map<string, LooseCodec>()
    for (const definition of definitions) {
      for (const { urlKey, codec } of dynamic.resolve(definition)) {
        codecs.set(urlKey, asLoose(codec))
      }
    }

    // Every known key is cleared, then the ones `serialize` returns are set.
    const updates = new Map<string, string | null>()
    for (const urlKey of codecs.keys()) {
      updates.set(`${fullPrefix}.${urlKey}`, null)
    }
    for (const [urlKey, entry] of dynamic.serialize(value, definitions)) {
      const codec = codecs.get(urlKey)
      if (codec) {
        // The same normalization as static keys; a rejected entry is removed.
        updates.set(`${fullPrefix}.${urlKey}`, normalizeWrite(codec, entry).raw)
      }
    }
    return [...updates].map(([key, raw]) => ({ key, value: raw }))
  }

  // --- Whole group ---

  function readAll(): Value {
    const values: Record<string, unknown> = {}
    for (const [property, { urlKey, codec }] of staticKeys) {
      values[property] = readKey(client, urlKey, codec)
    }
    for (const [property, { fullPrefix, def }] of dynamicKeys) {
      values[property] = readDynamic(fullPrefix, def)
    }
    applyRules(values)
    // SAFETY: values holds one entry per schema property, each read through its own entry.
    return values as Value
  }

  /** Cross-field rules, in declaration order: a key one rule rejected is back to its default. */
  function applyRules(values: Record<string, unknown>): void {
    for (const [name, rule] of rules) {
      if (rule.keys.some((key) => values[key] === undefined)) {
        continue
      }
      const picked = Object.fromEntries(rule.keys.map((key) => [key, values[key]]))
      let passed: boolean
      let message = rule.message ?? `rule "${name}" failed`
      try {
        passed = rule.check(picked)
      } catch (error) {
        // A check that throws rejects its keys instead of breaking the whole read.
        passed = false
        message = `rule "${name}" threw: ${String(error)}`
      }
      if (passed) {
        continue
      }
      const issue: QueryIssue = { reason: 'group', rule: name, message }
      for (const key of rule.reject) {
        const target = staticKeys.get(key)
        if (target) {
          values[key] = target.codec.defaultValue
          client.reportIssue(target.urlKey, client.get(target.urlKey) ?? '', issue)
          continue
        }
        const dynamic = dynamicKeys.get(key)
        if (dynamic) {
          values[key] = dynamic.def.options.default
          client.reportIssue(dynamic.fullPrefix, '', issue)
        }
      }
    }
  }

  function writeAll(next: Value): Value {
    // SAFETY: Value is a record keyed by the schema properties.
    const input = next as Record<string, unknown>
    const stored: Record<string, unknown> = { ...input }
    const updates: { key: string; value: string | null; historyMode?: HistoryMode }[] = []

    for (const [property, { urlKey, codec }] of staticKeys) {
      const normalized = normalizeWrite(codec, input[property])
      stored[property] = normalized.value
      const raw = rawToWrite(codec, normalized.raw)
      client.clearIssue(urlKey)
      // Only keys this write changes are queued, so one codec's history mode, or the
      // group's, never applies to a key that did not move.
      if (raw !== (client.get(urlKey) ?? null)) {
        updates.push({ key: urlKey, value: raw, historyMode: codec.historyMode })
      }
    }
    for (const [property, { fullPrefix, def }] of dynamicKeys) {
      for (const update of writeDynamic(fullPrefix, def, input[property])) {
        if (update.value !== (client.get(update.key) ?? null)) {
          updates.push(update)
        }
      }
    }

    if (updates.length) {
      client.setBatch(updates, historyMode)
    }
    // Dynamic values are read back, so the ref holds what their codecs accepted.
    for (const [property, { fullPrefix, def }] of dynamicKeys) {
      stored[property] = readDynamic(fullPrefix, def)
    }
    // SAFETY: stored mirrors the input object with normalized values.
    return stored as Value
  }

  // --- Reactivity ---

  const internal = shallowRef<Value>(readAll())
  const staticUrlKeys = new Set([...staticKeys.values()].map(({ urlKey }) => urlKey))
  const dynamicPrefixes = [...dynamicKeys.values()].map(({ fullPrefix }) => `${fullPrefix}.`)

  // Writes from this group notify the subscription synchronously. Skip that echo, so the
  // stored value keeps what the app wrote: cross-field rules apply to reads only.
  let writing = false

  const unsubscribe = client.subscribe((changedKey) => {
    if (writing) {
      return
    }
    if (
      staticUrlKeys.has(changedKey) ||
      dynamicPrefixes.some((fullPrefix) => changedKey.startsWith(fullPrefix))
    ) {
      internal.value = readAll()
    }
  })
  onScopeDispose(unsubscribe)

  return computed({
    get: () => internal.value,
    set: (value) => {
      writing = true
      try {
        internal.value = writeAll(value)
      } finally {
        writing = false
      }
    },
  })
}
