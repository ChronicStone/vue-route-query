/* oxlint-disable vitest/expect-expect -- the @ts-expect-error lines are the assertions */
import { describe, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import {
  arrayCodec,
  booleanCodec,
  dateCodec,
  defineCodec,
  dynamicQueryState,
  enumCodec,
  numberCodec,
  schemaCodec,
  stringCodec,
  useQueryState,
  useQueryStates,
} from '../src'

describe('useQueryState', () => {
  it('removes undefined when the codec has a default', () => {
    expectTypeOf(
      useQueryState('page', numberCodec({ default: 1, int: true, min: 1 })).value,
    ).toEqualTypeOf<number>()
  })

  it('keeps undefined without a default', () => {
    expectTypeOf(useQueryState('q', stringCodec()).value).toEqualTypeOf<string | undefined>()
  })

  it('keeps the literal union of an enum', () => {
    expectTypeOf(useQueryState('layout', enumCodec(['grid', 'table'])).value).toEqualTypeOf<
      'grid' | 'table' | undefined
    >()
  })

  it('takes the type of a Standard Schema', () => {
    const sort = useQueryState(
      'sort',
      schemaCodec(z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }), {
        default: { key: 'createdAt', direction: 'desc' },
      }),
    )
    expectTypeOf(sort.value).toEqualTypeOf<{ key: string; direction: 'asc' | 'desc' }>()
  })

  it('types a custom codec', () => {
    const rangeCodec = defineCodec<[number, number]>({
      parse: () => ({ ok: true, value: [0, 1] }),
      serialize: ([min, max]) => `${min}..${max}`,
    })
    expectTypeOf(useQueryState('price', rangeCodec({ default: [0, 500] })).value).toEqualTypeOf<
      [number, number]
    >()
  })
})

describe('useQueryStates', () => {
  it('infers every property from its codec', () => {
    const filters = useQueryStates({
      prefix: 'filters',
      schema: {
        status: arrayCodec(enumCodec(['open', 'closed', 'draft']), {
          default: [],
          invalidItems: 'drop',
        }),
        salaryMin: numberCodec({ int: true, min: 0 }),
        from: dateCodec({ format: 'date' }),
        remote: booleanCodec({ default: false, historyMode: 'push' }),
        fields: dynamicQueryState({
          urlPrefix: 'fields',
          definitions: () => [{ key: 'team' }],
          resolve: (definition) => [{ urlKey: definition.key, codec: stringCodec() }],
          parse: (entries) => [...entries.keys()],
          serialize: (keys) => new Map(keys.map((key) => [key, key])),
          default: [] as string[],
        }),
      },
      urlKeys: { salaryMin: 'salary' },
    })

    expectTypeOf(filters.value).toEqualTypeOf<{
      status: ('open' | 'closed' | 'draft')[]
      salaryMin: number | undefined
      from: Date | undefined
      remote: boolean
      fields: string[]
    }>()
  })

  it('types cross-field rules from the schema', () => {
    useQueryStates({
      schema: { salaryMin: numberCodec(), salaryMax: numberCodec() },
      rules: {
        salaryRange: {
          keys: ['salaryMin', 'salaryMax'],
          check: (values) => {
            expectTypeOf(values).toEqualTypeOf<{ salaryMin: number; salaryMax: number }>()
            return values.salaryMin <= values.salaryMax
          },
          reject: ['salaryMax'],
        },
      },
    })
  })
})

describe('mistakes caught at the call site', () => {
  it('rejects wrong options and defaults', () => {
    // @ts-expect-error a default outside the enum
    enumCodec(['grid', 'table'], { default: 'kanban' })
    // @ts-expect-error min is a number on numberCodec
    numberCodec({ min: new Date() })
    // @ts-expect-error dateCodec needs a format
    dateCodec({})
    // @ts-expect-error a default of the wrong type
    numberCodec({ default: '1' })
    // @ts-expect-error validate receives the codec's type
    stringCodec({ validate: (text: number) => text > 0 })
    // @ts-expect-error invalidItems is a literal union
    arrayCodec(stringCodec(), { invalidItems: 'skip' })
    // @ts-expect-error schemaCodec has no validate: the schema is the rule
    schemaCodec(z.object({ x: z.number() }), { validate: () => true })
    // @ts-expect-error a default the schema output does not allow
    schemaCodec(z.object({ x: z.number() }), { default: { x: 'a' } })
  })

  it('rejects rules that read or reject keys they should not', () => {
    useQueryStates({
      schema: { from: dateCodec({ format: 'date' }), to: dateCodec({ format: 'date' }) },
      rules: {
        // @ts-expect-error `to` is not among the rule's keys
        period: { keys: ['from'], check: ({ to }) => to !== undefined, reject: ['from'] },
      },
    })
    useQueryStates({
      schema: { from: dateCodec({ format: 'date' }), to: dateCodec({ format: 'date' }) },
      rules: {
        // @ts-expect-error a rejected key must be one the rule reads
        period: { keys: ['from'], check: () => true, reject: ['to'] },
      },
    })
    useQueryStates({
      schema: { from: dateCodec({ format: 'date' }) },
      // @ts-expect-error a key that is not in the schema
      rules: { period: { keys: ['until'], check: () => true, reject: ['until'] } },
    })
  })

  it('rejects a schema entry that is not a codec', () => {
    // @ts-expect-error the v1 entry shape is gone
    useQueryStates({ schema: { page: { codec: numberCodec(), defaultValue: 1 } } })
  })
})
