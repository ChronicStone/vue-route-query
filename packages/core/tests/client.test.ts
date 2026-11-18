import { describe, expect, it, vi } from 'vitest'

import { QueryStateClient } from '../src'
import { createHarness } from './harness'

describe('QueryStateClient', () => {
  it('reads the current route query', async () => {
    const { router } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })

    expect(client.get('page')).toBe('2')
    expect(client.get('missing')).toBeNull()
  })

  it('reads the first value of a repeated key', async () => {
    const { router } = await createHarness('/?tag=a&tag=b')
    const client = new QueryStateClient({ router })

    expect(client.get('tag')).toBe('a')
  })

  it('makes a write readable at once, before the URL changes', async () => {
    const { router } = await createHarness('/')
    const client = new QueryStateClient({ router })

    client.set('page', '3')

    expect(client.get('page')).toBe('3')
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('batches writes from one tick into a single navigation', async () => {
    const { router, settle } = await createHarness('/?keep=1')
    const client = new QueryStateClient({ router })
    const replace = vi.spyOn(router, 'replace')

    client.set('page', '3')
    client.set('size', '50')
    client.setBatch([
      { key: 'sort', value: 'name' },
      { key: 'page', value: '4' },
    ])
    await settle()

    expect(replace).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query).toStrictEqual({
      keep: '1',
      page: '4',
      size: '50',
      sort: 'name',
    })
  })

  it('removes a key written as null', async () => {
    const { router, settle } = await createHarness('/?page=2&size=50')
    const client = new QueryStateClient({ router })

    client.set('page', null)
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ size: '50' })
  })

  it('does not navigate when nothing changed', async () => {
    const { router, settle } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    client.set('page', '2')
    await settle()

    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('replaces history by default and pushes when any write in the batch asks for it', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router })
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    client.set('page', '2')
    await settle()
    expect(replace).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()

    client.set('page', '3')
    client.set('size', '50', 'push')
    await settle()
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('honours a default history mode of push', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router, defaultHistoryMode: 'push' })
    const push = vi.spyOn(router, 'push')

    client.set('page', '2')
    await settle()

    expect(push).toHaveBeenCalledTimes(1)
  })

  it('keeps every key when writes land in separate ticks before navigation settles', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router })

    client.set('page', '2')
    await Promise.resolve()
    await Promise.resolve()
    client.set('size', '50')
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ page: '2', size: '50' })
  })

  it('never reports a stale value to subscribers while writes are on their way', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router })
    router.afterEach(() => client.syncFromRoute())
    const seen: [string, string | null][] = []
    client.subscribe((key, value) => seen.push([key, value]))

    client.set('page', '2')
    await Promise.resolve()
    await Promise.resolve()
    client.set('size', '50')
    await settle()

    expect(seen).toStrictEqual([
      ['page', '2'],
      ['size', '50'],
    ])
    expect(client.get('page')).toBe('2')
    expect(client.get('size')).toBe('50')
  })

  it('lets a later write undo an earlier one that is still navigating', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router })

    client.set('page', '2')
    await Promise.resolve()
    await Promise.resolve()
    client.set('page', null)
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({})
    expect(client.get('page')).toBeNull()
  })

  it('keeps a history entry asked for by a write that a later write supersedes', async () => {
    const { router, settle } = await createHarness('/')
    const client = new QueryStateClient({ router })
    const push = vi.spyOn(router, 'push')
    const replace = vi.spyOn(router, 'replace')

    client.set('page', '2', 'push')
    await Promise.resolve()
    await Promise.resolve()
    client.set('size', '50')
    await settle()

    expect(push).toHaveBeenCalledTimes(2)
    expect(replace).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query).toStrictEqual({ page: '2', size: '50' })
  })

  it('returns to the route value when a navigation guard blocks the write', async () => {
    const { router, settle } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })
    router.afterEach(() => client.syncFromRoute())
    router.beforeEach((to) => to.query.page !== '9')
    const subscriber = vi.fn<(key: string, value: string | null) => void>()
    client.subscribe(subscriber)
    client.get('page')

    client.set('page', '9')
    expect(client.get('page')).toBe('9')
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ page: '2' })
    expect(client.get('page')).toBe('2')
    expect(subscriber).toHaveBeenLastCalledWith('page', '2')

    client.set('size', '50')
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ page: '2', size: '50' })
  })

  it('recovers when a navigation guard throws, without an unhandled rejection', async () => {
    const { router, settle } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })
    router.afterEach(() => client.syncFromRoute())
    const reported = vi.fn<(error: unknown) => void>()
    router.onError(reported)
    const unhandled = vi.fn<(reason: unknown) => void>()
    process.on('unhandledRejection', unhandled)
    const stopGuard = router.beforeEach(() => {
      throw new Error('guard failed')
    })
    client.get('page')

    client.set('page', '9')
    await settle()
    await settle()
    process.off('unhandledRejection', unhandled)

    expect(reported).toHaveBeenCalledTimes(1)
    expect(unhandled).not.toHaveBeenCalled()
    expect(client.get('page')).toBe('2')

    stopGuard()
    client.set('page', '3')
    await settle()

    expect(router.currentRoute.value.query).toStrictEqual({ page: '3' })
  })

  it('does not carry a pending write onto a page the app navigated to meanwhile', async () => {
    const { router, settle } = await createHarness('/list')
    const client = new QueryStateClient({ router })
    router.afterEach(() => client.syncFromRoute())

    client.set('page', '2')
    await Promise.resolve()
    await Promise.resolve()
    await router.push('/other')
    await settle()

    expect(router.currentRoute.value.fullPath).toBe('/other')

    client.set('tab', 'a')
    await settle()

    expect(router.currentRoute.value.fullPath).toBe('/other?tab=a')
  })

  it('notifies subscribers synchronously on write and stops after unsubscribe', async () => {
    const { router } = await createHarness('/')
    const client = new QueryStateClient({ router })
    const subscriber = vi.fn<(key: string, value: string | null) => void>()
    const unsubscribe = client.subscribe(subscriber)

    client.set('page', '2')
    expect(subscriber).toHaveBeenCalledWith('page', '2')

    unsubscribe()
    client.set('page', '3')
    expect(subscriber).toHaveBeenCalledTimes(1)
  })

  it('syncs cached keys from an outside navigation and tells subscribers', async () => {
    const { router } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })
    const subscriber = vi.fn<(key: string, value: string | null) => void>()
    client.subscribe(subscriber)
    client.get('page')

    await router.push('/?page=7')
    client.syncFromRoute()

    expect(client.get('page')).toBe('7')
    expect(subscriber).toHaveBeenCalledWith('page', '7')

    await router.push('/')
    client.syncFromRoute()

    expect(client.get('page')).toBeNull()
    expect(subscriber).toHaveBeenLastCalledWith('page', null)
  })

  it('drops cached values and pending writes on clear', async () => {
    const { router, settle } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })

    client.set('page', '9')
    client.clear()
    await settle()

    expect(client.get('page')).toBe('2')
    expect(router.currentRoute.value.query).toStrictEqual({ page: '2' })
  })

  it('exposes a devtools snapshot and update hook', async () => {
    const { router } = await createHarness('/?page=2')
    const client = new QueryStateClient({ router })
    const listener = vi.fn<() => void>()
    const off = client.onDevtoolsUpdate(listener)

    client.set('size', '50', 'push')

    expect(listener).toHaveBeenCalledTimes(1)
    const snapshot = client.__devtools__()
    expect(snapshot.cache).toStrictEqual({ size: '50' })
    expect(snapshot.routeQuery).toStrictEqual({ page: '2' })
    expect(snapshot.pendingUpdates).toStrictEqual([
      { historyMode: 'push', key: 'size', value: '50' },
    ])
    expect(snapshot.mutationLog).toHaveLength(1)

    off()
    client.set('size', '10')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps only the most recent writes in the devtools log', async () => {
    const { router } = await createHarness('/')
    const client = new QueryStateClient({ router })

    for (let index = 0; index < 10_000; index++) {
      client.set('page', String(index))
    }

    const { mutationLog } = client.__devtools__()
    expect(mutationLog).toHaveLength(50)
    expect(mutationLog.at(-1)?.value).toBe('9999')
  })
})
