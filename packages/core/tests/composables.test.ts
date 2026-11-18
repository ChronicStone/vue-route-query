import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { z } from 'zod'

import {
  QueryStateClient,
  arrayCodec,
  dateCodec,
  dynamicQueryState,
  enumCodec,
  numberCodec,
  registerQueryStateClient,
  schemaCodec,
  stringCodec,
  useQueryState,
  useQueryStateClient,
  useQueryStates,
} from '../src'
import type { AnyQueryCodec } from '../src'
import { createHarness } from './harness'

describe('useQueryStateClient', () => {
  it('shares one client per router', async () => {
    const { run } = await createHarness('/')

    expect(run(() => useQueryStateClient())).toBe(run(() => useQueryStateClient()))
  })

  it('returns a client registered up front', async () => {
    const { router, run } = await createHarness('/')
    const client = new QueryStateClient({ router, defaultHistoryMode: 'push' })
    registerQueryStateClient(router, client)

    expect(run(() => useQueryStateClient())).toBe(client)
  })

  it('keeps a registered client in step with outside navigations', async () => {
    const { router, run } = await createHarness('/?page=2')
    registerQueryStateClient(router, new QueryStateClient({ router }))
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    await router.push('/?page=9')

    expect(page.value).toBe(9)
  })

  it('stops syncing a client that was replaced by another registration', async () => {
    const { router } = await createHarness('/?page=2')
    const replaced = new QueryStateClient({ router })
    registerQueryStateClient(router, replaced)
    replaced.get('page')
    registerQueryStateClient(router, new QueryStateClient({ router }))

    await router.push('/?page=9')

    expect(replaced.get('page')).toBe('2')
  })

  it('applies the default history mode given at first use', async () => {
    const { router, run, settle } = await createHarness('/')
    const push = vi.spyOn(router, 'push')
    const client = run(() => useQueryStateClient({ defaultHistoryMode: 'push' }))

    client.set('page', '2')
    await settle()

    expect(push).toHaveBeenCalledTimes(1)
  })
})

describe('useQueryState', () => {
  it('reads the URL value and falls back to the default', async () => {
    const { run } = await createHarness('/?page=3')

    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))
    const size = run(() => useQueryState('size', numberCodec({ default: 20 })))

    expect(page.value).toBe(3)
    expect(size.value).toBe(20)
  })

  it('falls back to the default when the URL value is not accepted by the codec', async () => {
    const { run } = await createHarness('/?layout=kanban')

    const layout = run(() =>
      useQueryState('layout', enumCodec(['grid', 'table'], { default: 'table' })),
    )

    expect(layout.value).toBe('table')
  })

  it('falls back to the default when a number key is not a number', async () => {
    const { run } = await createHarness('/?page=abc')

    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    expect(page.value).toBe(1)
  })

  it('writes to the URL and updates the ref at once', async () => {
    const { router, run, settle } = await createHarness('/')
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    page.value = 4
    expect(page.value).toBe(4)

    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({ page: '4' })
  })

  it('removes the key when the value returns to its default', async () => {
    const { router, run, settle } = await createHarness('/?page=4')
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    page.value = 1
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({})
  })

  it('keeps the default in the URL when omitDefault is false', async () => {
    const { router, run, settle } = await createHarness('/?page=4')
    const page = run(() => useQueryState('page', numberCodec({ default: 1, omitDefault: false })))

    page.value = 1
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ page: '1' })
  })

  it('pushes a history entry when asked', async () => {
    const { router, run, settle } = await createHarness('/')
    const push = vi.spyOn(router, 'push')
    const page = run(() => useQueryState('page', numberCodec({ default: 1, historyMode: 'push' })))

    page.value = 2
    await settle()

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('follows an outside navigation such as the back button', async () => {
    const { router, run } = await createHarness('/?page=2')
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    await router.push('/?page=9')
    expect(page.value).toBe(9)

    await router.push('/')
    expect(page.value).toBe(1)
  })

  it('keeps two bindings of the same key in step', async () => {
    const { run } = await createHarness('/')
    const first = run(() => useQueryState('q', stringCodec({ default: '' })))
    const second = run(() => useQueryState('q', stringCodec({ default: '' })))

    first.value = 'emma'

    expect(second.value).toBe('emma')
  })

  it('leaves unrelated query keys untouched', async () => {
    const { router, run, settle } = await createHarness('/?tab=billing')
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    page.value = 2
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ tab: 'billing', page: '2' })
  })

  it('stops listening once its scope is disposed', async () => {
    const { router, run, dispose } = await createHarness('/?page=2')
    const page = run(() => useQueryState('page', numberCodec({ default: 1 })))

    dispose()
    await router.push('/?page=9')

    expect(page.value).toBe(2)
  })

  it('round-trips a long list with characters that need URL escaping', async () => {
    const tags = Array.from({ length: 200 }, (_, index) => `étiquette ${index} & co/été?`)
    const { router, run, settle } = await createHarness('/')
    const state = run(() =>
      useQueryState('tags', arrayCodec(stringCodec(), { separator: '|', default: [] })),
    )

    state.value = tags
    await settle()

    const reloaded = await createHarness(router.currentRoute.value.fullPath)
    const restored = reloaded.run(() =>
      useQueryState('tags', arrayCodec(stringCodec(), { separator: '|', default: [] })),
    )
    expect(restored.value).toStrictEqual(tags)
  })
})

describe('useQueryStates', () => {
  it('pushes when a changed entry asks for push, and replaces otherwise', async () => {
    const { router, run, settle } = await createHarness('/')
    const push = vi.spyOn(router, 'push')
    const replace = vi.spyOn(router, 'replace')
    const state = run(() =>
      useQueryStates({
        schema: {
          step: numberCodec({ default: 1, historyMode: 'push' }),
          q: stringCodec({ default: '' }),
        },
      }),
    )

    state.value = { ...state.value, q: 'vue' }
    await settle()
    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledTimes(1)

    state.value = { ...state.value, step: 2 }
    await settle()
    expect(push).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query).toStrictEqual({ q: 'vue', step: '2' })
  })

  function usePagination() {
    return useQueryStates({
      prefix: 'p',
      schema: {
        pageIndex: numberCodec({ default: 1 }),
        pageSize: numberCodec({ default: 20 }),
      },
      urlKeys: { pageIndex: 'page', pageSize: 'size' },
    })
  }

  it('reads prefixed keys with their defaults', async () => {
    const { run } = await createHarness('/?p.page=2')

    expect(run(usePagination).value).toStrictEqual({ pageIndex: 2, pageSize: 20 })
  })

  it('writes the whole group in one navigation and omits defaults', async () => {
    const { router, run, settle } = await createHarness('/')
    const replace = vi.spyOn(router, 'replace')
    const pagination = run(usePagination)

    pagination.value = { pageIndex: 3, pageSize: 20 }
    await settle()

    expect(replace).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query).toStrictEqual({ 'p.page': '3' })
  })

  it('uses the property name as the URL key without a prefix or urlKeys', async () => {
    const { router, run, settle } = await createHarness('/')
    const state = run(() => useQueryStates({ schema: { search: stringCodec({ default: '' }) } }))

    state.value = { search: 'emma' }
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ search: 'emma' })
  })

  it('follows an outside navigation', async () => {
    const { router, run } = await createHarness('/?p.page=2')
    const pagination = run(usePagination)

    await router.push('/?p.page=5&p.size=100')

    expect(pagination.value).toStrictEqual({ pageIndex: 5, pageSize: 100 })
  })

  it('batches two groups written in the same tick into one navigation', async () => {
    const { router, run, settle } = await createHarness('/')
    const replace = vi.spyOn(router, 'replace')
    const pagination = run(usePagination)
    const sorting = run(() =>
      useQueryStates({
        prefix: 's',
        schema: {
          key: stringCodec({ default: '' }),
          dir: enumCodec(['asc', 'desc'], { default: 'asc' }),
        },
      }),
    )

    pagination.value = { pageIndex: 2, pageSize: 50 }
    sorting.value = { key: 'hiredAt', dir: 'desc' }
    await settle()

    expect(replace).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query).toStrictEqual({
      'p.page': '2',
      'p.size': '50',
      's.key': 'hiredAt',
      's.dir': 'desc',
    })
  })
})

describe('dynamicQueryState', () => {
  interface FilterDefinition {
    key: string
    operators: string[]
    defaultOperator: string
    codec: AnyQueryCodec
  }

  interface FilterRule {
    key: string
    operator: string
    value: unknown
  }

  const definitions = ref<FilterDefinition[]>([
    { key: 'department', operators: ['is'], defaultOperator: 'is', codec: stringCodec() },
    { key: 'salary', operators: ['is', 'gte'], defaultOperator: 'is', codec: numberCodec() },
  ])

  function urlKeyFor(definition: FilterDefinition, operator: string): string {
    return operator === definition.defaultOperator
      ? definition.key
      : `${definition.key}~${operator}`
  }

  function useFilters(source = definitions) {
    return useQueryStates({
      prefix: 'f',
      schema: {
        search: stringCodec({ default: '' }),
        ui: dynamicQueryState<FilterDefinition, FilterRule[]>({
          urlPrefix: 'ui',
          definitions: () => source.value,
          default: [],
          resolve: (definition) =>
            definition.operators.map((operator) => ({
              urlKey: urlKeyFor(definition, operator),
              codec: definition.codec,
            })),
          parse: (entries, current) =>
            current.flatMap((definition) =>
              definition.operators.flatMap((operator) => {
                const value = entries.get(urlKeyFor(definition, operator))
                return value === undefined ? [] : [{ key: definition.key, operator, value }]
              }),
            ),
          serialize: (rules, current) =>
            new Map(
              rules.flatMap((rule): [string, unknown][] => {
                const definition = current.find((item) => item.key === rule.key)
                return definition ? [[urlKeyFor(definition, rule.operator), rule.value]] : []
              }),
            ),
        }),
      },
    })
  }

  it('parses runtime-defined keys with their own codecs', async () => {
    const { run } = await createHarness('/?f.ui.department=Engineering&f.ui.salary~gte=100000')

    expect(run(() => useFilters()).value).toStrictEqual({
      search: '',
      ui: [
        { key: 'department', operator: 'is', value: 'Engineering' },
        { key: 'salary', operator: 'gte', value: 100_000 },
      ],
    })
  })

  it('returns the default when no dynamic key is present', async () => {
    const { run } = await createHarness('/?f.search=emma')

    expect(run(() => useFilters()).value).toStrictEqual({ search: 'emma', ui: [] })
  })

  it('writes active rules and clears the ones that were removed', async () => {
    const { router, run, settle } = await createHarness('/?f.ui.department=Engineering')
    const filters = run(() => useFilters())

    filters.value = { search: 'emma', ui: [{ key: 'salary', operator: 'gte', value: 100_000 }] }
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({
      'f.search': 'emma',
      'f.ui.salary~gte': '100000',
    })
  })

  it('follows an outside navigation on a dynamic key', async () => {
    const { router, run } = await createHarness('/')
    const filters = run(() => useFilters())
    expect(filters.value.ui).toStrictEqual([])

    await router.push('/?f.ui.department=Sales')

    expect(filters.value.ui).toStrictEqual([{ key: 'department', operator: 'is', value: 'Sales' }])
  })

  it('returns the default while there are no definitions yet', async () => {
    const { run } = await createHarness('/?f.ui.department=Engineering')

    expect(run(() => useFilters(ref([]))).value.ui).toStrictEqual([])
  })
})

describe('validation', () => {
  it('normalizes writes through the codec, so the ref never holds a rejected value', async () => {
    const { router, run, settle } = await createHarness('/?page=4')
    const page = run(() => useQueryState('page', numberCodec({ default: 1, int: true, min: 1 })))

    page.value = 0
    expect(page.value).toBe(1)

    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({})
  })

  it('clamps out-of-range values when asked, on read and on write', async () => {
    const { router, run, settle } = await createHarness('/?size=500')
    const size = run(() =>
      useQueryState('size', numberCodec({ default: 20, min: 10, max: 100, outOfRange: 'clamp' })),
    )
    expect(size.value).toBe(100)

    size.value = 5
    expect(size.value).toBe(10)
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({ size: '10' })
  })

  it('leaves an invalid URL value in place and reports it in issues', async () => {
    const { router, run } = await createHarness('/?page=0')
    const page = run(() => useQueryState('page', numberCodec({ default: 1, min: 1 })))
    const client = run(() => useQueryStateClient())

    expect(page.value).toBe(1)
    expect(router.currentRoute.value.query).toStrictEqual({ page: '0' })
    expect(client.issues.get('page')).toMatchObject({ raw: '0', reason: 'option', partial: false })

    await router.push('/?page=3')
    expect(page.value).toBe(3)
    expect(client.issues.has('page')).toBe(false)
  })

  it('drops invalid list items when asked, and reports the drop', async () => {
    const { run } = await createHarness('/?status=open,bogus,closed')
    const status = run(() =>
      useQueryState(
        'status',
        arrayCodec(enumCodec(['open', 'closed']), { default: [], invalidItems: 'drop' }),
      ),
    )
    const client = run(() => useQueryStateClient())

    expect(status.value).toStrictEqual(['open', 'closed'])
    expect(client.issues.get('status')).toMatchObject({ partial: true })
    expect(client.issues.get('status')?.message).toContain('"bogus"')
  })

  it('rejects the whole list on an invalid item by default', async () => {
    const { run } = await createHarness('/?status=open,bogus')
    const status = run(() =>
      useQueryState('status', arrayCodec(enumCodec(['open', 'closed']), { default: [] })),
    )

    expect(status.value).toStrictEqual([])
  })

  function useSalaryFilters() {
    return useQueryStates({
      schema: {
        salaryMin: numberCodec({ min: 0 }),
        salaryMax: numberCodec({ min: 0 }),
        from: dateCodec({ format: 'date' }),
      },
      rules: {
        salaryRange: {
          keys: ['salaryMin', 'salaryMax'],
          check: ({ salaryMin, salaryMax }) => salaryMin <= salaryMax,
          reject: ['salaryMax'],
          message: 'The maximum is below the minimum',
        },
      },
    })
  }

  it('applies cross-field rules when the URL is read, rejecting only the named keys', async () => {
    const { run } = await createHarness('/?salaryMin=50000&salaryMax=40000&from=2024-01-31')
    const filters = run(useSalaryFilters)
    const client = run(() => useQueryStateClient())

    expect(filters.value.salaryMin).toBe(50000)
    expect(filters.value.salaryMax).toBeUndefined()
    expect(filters.value.from?.toISOString()).toBe('2024-01-31T00:00:00.000Z')
    expect(client.issues.get('salaryMax')).toMatchObject({
      reason: 'group',
      rule: 'salaryRange',
      message: 'The maximum is below the minimum',
    })
  })

  it('skips a rule while one of its keys is missing', async () => {
    const { run } = await createHarness('/?salaryMax=40000')

    expect(run(useSalaryFilters).value.salaryMax).toBe(40000)
  })

  it('keeps what the app writes even when it breaks a rule', async () => {
    const { router, run, settle } = await createHarness('/?salaryMax=40000')
    const filters = run(useSalaryFilters)

    filters.value = { ...filters.value, salaryMin: 50000 }
    expect(filters.value.salaryMax).toBe(40000)

    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({
      salaryMin: '50000',
      salaryMax: '40000',
    })
  })

  it('ignores a rejected dynamic entry instead of passing it to parse', async () => {
    const { run } = await createHarness('/?f.fields.salary=abc&f.fields.team=core')
    const client = run(() => useQueryStateClient())
    const state = run(() =>
      useQueryStates({
        prefix: 'f',
        schema: {
          fields: dynamicQueryState({
            urlPrefix: 'fields',
            definitions: () => [
              { key: 'salary', codec: numberCodec() },
              { key: 'team', codec: stringCodec() },
            ],
            resolve: (definition) => [{ urlKey: definition.key, codec: definition.codec }],
            parse: (entries) => Object.fromEntries(entries),
            serialize: (value: Record<string, unknown>) => new Map(Object.entries(value)),
            default: {} as Record<string, unknown>,
          }),
        },
      }),
    )

    expect(state.value.fields).toStrictEqual({ team: 'core' })
    expect(client.issues.get('f.fields.salary')).toMatchObject({ raw: 'abc', reason: 'format' })
  })
})

describe('review fixes', () => {
  it('warns once in development about a rejected URL value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { run } = await createHarness('/?page=abc')
    run(() => useQueryState('page', numberCodec({ default: 1 })))
    run(() => useQueryState('page', numberCodec({ default: 1 })))

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('?page=abc'))
    warn.mockRestore()
  })

  it('treats null as clearing the value, and never throws on a value it cannot write', async () => {
    const { router, run, settle } = await createHarness('/?from=2024-01-31')
    const from = run(() => useQueryState('from', dateCodec({ format: 'date' })))

    expect(() => {
      // @ts-expect-error null is not part of the type, but templates can still send it
      from.value = null
    }).not.toThrow()
    expect(from.value).toBeUndefined()
    expect(() => {
      from.value = new Date('not a date')
    }).not.toThrow()

    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({})
  })

  it('reports a rule that throws instead of breaking the read', async () => {
    const { run } = await createHarness('/?min=1&max=2')
    const client = run(() => useQueryStateClient())
    const state = run(() =>
      useQueryStates({
        schema: { min: numberCodec(), max: numberCodec() },
        rules: {
          range: {
            keys: ['min', 'max'],
            check: () => {
              throw new Error('boom')
            },
            reject: ['max'],
          },
        },
      }),
    )

    expect(state.value).toStrictEqual({ min: 1, max: undefined })
    expect(client.issues.get('max')?.message).toContain('boom')
  })

  it("keeps a codec's replace mode inside a push group when only that key changes", async () => {
    const { router, run, settle } = await createHarness('/?step=2')
    const push = vi.spyOn(router, 'push')
    const replace = vi.spyOn(router, 'replace')
    const state = run(() =>
      useQueryStates({
        historyMode: 'push',
        schema: {
          step: numberCodec({ default: 1 }),
          q: stringCodec({ default: '', historyMode: 'replace' }),
        },
      }),
    )

    state.value = { ...state.value, q: 'vue' }
    await settle()

    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('keeps an empty list when the default is not empty', async () => {
    const { router, run, settle } = await createHarness('/')
    const tags = run(() => useQueryState('tags', arrayCodec(stringCodec(), { default: ['vue'] })))

    tags.value = []
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ tags: '' })
    const reloaded = await createHarness(router.currentRoute.value.fullPath)
    expect(
      reloaded.run(() => useQueryState('tags', arrayCodec(stringCodec(), { default: ['vue'] })))
        .value,
    ).toStrictEqual([])
  })

  it('normalizes writes to dynamic entries through their codecs', async () => {
    const { router, run, settle } = await createHarness('/')
    const state = run(() =>
      useQueryStates({
        schema: {
          fields: dynamicQueryState({
            urlPrefix: 'f',
            definitions: () => [{ key: 'n' }],
            resolve: (definition) => [{ urlKey: definition.key, codec: numberCodec({ min: 1 }) }],
            parse: (entries) => Object.fromEntries(entries),
            serialize: (fields: Record<string, unknown>) => new Map(Object.entries(fields)),
            default: {} as Record<string, unknown>,
          }),
        },
      }),
    )

    state.value = { fields: { n: 0 } }
    expect(state.value.fields).toStrictEqual({})
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({})

    state.value = { fields: { n: 3 } }
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({ 'f.n': '3' })
  })
})

describe('schemaCodec', () => {
  it('omits the default whatever the key order of the written object', async () => {
    const { router, run, settle } = await createHarness('/?sort={"direction":"asc","key":"name"}')
    const sort = run(() =>
      useQueryState(
        'sort',
        schemaCodec(z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }), {
          default: { key: 'createdAt', direction: 'desc' },
        }),
      ),
    )

    sort.value = { direction: 'desc', key: 'createdAt' }
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({})
  })

  const compactSort = (format?: 'null-on-name') =>
    schemaCodec(z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }), {
      default: { key: 'createdAt', direction: 'desc' },
      format: {
        parse: (raw) => {
          const at = raw.lastIndexOf(':')
          return { key: raw.slice(0, at), direction: raw.slice(at + 1) }
        },
        serialize: ({ key, direction }) =>
          format === 'null-on-name' && key === 'name' ? null : `${key}:${direction}`,
      },
    })

  it('writes a custom format and omits its default', async () => {
    const { router, run, settle } = await createHarness('/')
    const sort = run(() => useQueryState('sort', compactSort()))

    sort.value = { key: 'a:b', direction: 'asc' }
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({ sort: 'a:b:asc' })
    expect(sort.value).toStrictEqual({ key: 'a:b', direction: 'asc' })

    sort.value = { key: 'createdAt', direction: 'desc' }
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({})
  })

  it('removes the key when the custom format writes null', async () => {
    const { router, run, settle } = await createHarness('/?sort=title:asc')
    const sort = run(() => useQueryState('sort', compactSort('null-on-name')))

    sort.value = { key: 'name', direction: 'asc' }
    await settle()
    expect(router.currentRoute.value.query).toStrictEqual({})
  })
})
