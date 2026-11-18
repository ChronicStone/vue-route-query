/**
 * QueryStateClient — the central coordinator for URL query state.
 *
 * Inspired by nuqs's QueryClient:
 * - Maintains an in-memory cache of parsed query values
 * - Batches multiple mutations within the same microtask into a single router push/replace
 * - Supports multiple independent query state consumers without interference
 * - Reads and writes through a vue-router instance
 */
import { shallowReactive } from 'vue'
import type { Router, LocationQuery } from 'vue-router'

import type { QueryIssue } from './codecs'
import { isDev } from './env'
import { isNullish, isString } from './predicates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HistoryMode = 'push' | 'replace'

/**
 * Creates a query-state client bound to a router instance.
 *
 * A single client should usually be shared per router so multiple query-state
 * consumers can coordinate batched writes and route-sync behavior.
 */
export interface QueryStateClientOptions {
  /** Router instance whose current route and navigation methods back this client. */
  router: Router
  /** History mode used when callers do not provide one for a write. */
  defaultHistoryMode?: HistoryMode
}

interface PendingUpdate {
  key: string
  value: string | null // null = remove from URL
  historyMode: HistoryMode
}

interface LoggedMutation {
  timestamp: number
  key: string
  value: string | null
  historyMode: HistoryMode
}

type Subscriber = (key: string, value: string | null) => void

/** A URL value that was rejected or only partly used, with the raw string it came from. */
export interface QueryKeyIssue extends QueryIssue {
  raw: string
  /** `true` when part of the value was still used, such as a list that dropped an item. */
  partial: boolean
}

/** How many recent writes the devtools snapshot keeps. */
const MUTATION_LOG_LIMIT = 50

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class QueryStateClient {
  private router: Router
  private defaultHistoryMode: HistoryMode
  private cache = new Map<string, string | null>()
  private subscribers = new Set<Subscriber>()

  // Batching
  private pendingUpdates: PendingUpdate[] = []
  private flushScheduled = false

  // Writes the route has not confirmed yet. vue-router navigates asynchronously, so a
  // later flush must re-apply them instead of rebuilding from a route that is still stale.
  private unconfirmed = new Map<string, string | null>()
  private navigationsInFlight = 0
  private inFlightQuery: LocationQuery | null = null
  private inFlightPush = false

  // Devtools
  private devtoolsListeners = new Set<() => void>()
  private mutationLog: LoggedMutation[] = []

  /**
   * Keys whose current URL value was rejected or only partly used, keyed by URL key.
   * Reactive: show a notice such as "this link had invalid filters" from it.
   */
  readonly issues: ReadonlyMap<string, QueryKeyIssue> = shallowReactive(
    new Map<string, QueryKeyIssue>(),
  )
  private warned = new Set<string>()

  /** Create a query-state client backed by the provided router. */
  constructor(options: QueryStateClientOptions) {
    this.router = options.router
    this.defaultHistoryMode = options.defaultHistoryMode ?? 'replace'
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** Read a raw query value. Cache-first, falls back to current route. */
  get(key: string): string | null {
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null
    }

    const raw = this.readFromRoute(key)
    this.cache.set(key, raw)
    return raw
  }

  /** Read directly from the current route query. */
  private readFromRoute(key: string): string | null {
    const value = this.router.currentRoute.value.query[key]
    if (isNullish(value)) {
      return null
    }
    if (Array.isArray(value)) {
      // SAFETY: vue-router query arrays contain only strings or null values.
      return value[0] ?? null
    }
    // SAFETY: vue-router LocationQueryScalar is a string or null at this boundary.
    return isString(value) ? value : null
  }

  // ---------------------------------------------------------------------------
  // Write (batched)
  // ---------------------------------------------------------------------------

  /** Queue a single param update. Flushed at the end of the microtask. */
  set(key: string, value: string | null, historyMode?: HistoryMode): void {
    // Update cache immediately so subsequent reads within the same tick are consistent
    this.cache.set(key, value)
    this.unconfirmed.set(key, value)

    const mode = historyMode ?? this.defaultHistoryMode

    this.pendingUpdates.push({ historyMode: mode, key, value })
    this.logMutation({ historyMode: mode, key, timestamp: Date.now(), value })

    this.scheduleFlush()

    // Notify in-memory subscribers synchronously so Vue refs update immediately
    for (const subscriber of this.subscribers) {
      subscriber(key, value)
    }

    this.notifyDevtools()
  }

  /** Queue multiple param updates as a single batch. */
  setBatch(
    updates: { key: string; value: string | null; historyMode?: HistoryMode }[],
    historyMode?: HistoryMode,
  ): void {
    const batchMode = historyMode ?? this.defaultHistoryMode

    const now = Date.now()
    for (const update of updates) {
      const mode = update.historyMode ?? batchMode
      this.cache.set(update.key, update.value)
      this.unconfirmed.set(update.key, update.value)
      this.pendingUpdates.push({ historyMode: mode, key: update.key, value: update.value })
      this.logMutation({
        historyMode: mode,
        key: update.key,
        timestamp: now,
        value: update.value,
      })
    }

    this.scheduleFlush()

    for (const update of updates) {
      for (const subscriber of this.subscribers) {
        subscriber(update.key, update.value)
      }
    }

    this.notifyDevtools()
  }

  // ---------------------------------------------------------------------------
  // Flush
  // ---------------------------------------------------------------------------

  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return
    }
    this.flushScheduled = true

    // Use queueMicrotask for maximum batching within a single tick
    queueMicrotask(() => this.flush())
  }

  private flush(): void {
    this.flushScheduled = false

    if (!this.pendingUpdates.length) {
      return
    }

    const updates = this.pendingUpdates
    this.pendingUpdates = []

    // Use push if ANY update requests it, including one whose navigation is still in flight:
    // this flush supersedes that navigation and must not lose its history entry.
    const usePush =
      updates.some((u) => u.historyMode === 'push') ||
      (this.navigationsInFlight > 0 && this.inFlightPush)

    // Build the next query from the current route plus every write it has not confirmed yet
    const currentQuery = { ...this.router.currentRoute.value.query }
    const nextQuery: LocationQuery = { ...currentQuery }

    for (const [key, value] of this.unconfirmed) {
      if (isNullish(value)) {
        delete nextQuery[key]
      } else {
        nextQuery[key] = value
      }
    }

    // Only navigate if the URL would end up different from where it is already heading
    if (queryEquals(this.inFlightQuery ?? currentQuery, nextQuery)) {
      if (this.navigationsInFlight === 0) {
        this.unconfirmed.clear()
      }
      return
    }

    const navigate = usePush
      ? this.router.push.bind(this.router)
      : this.router.replace.bind(this.router)

    this.navigationsInFlight++
    this.inFlightQuery = nextQuery
    this.inFlightPush = usePush

    // A guard that throws rejects this promise. vue-router already reports that error through
    // `router.onError`, so settle either way instead of leaving an unhandled rejection behind.
    const settled = () => this.onNavigationSettled()
    void navigate({ query: nextQuery }).then(settled, settled)
  }

  private onNavigationSettled(): void {
    this.navigationsInFlight--
    if (this.navigationsInFlight > 0) {
      return
    }

    // The last navigation settled: the route is the truth again, even if a guard blocked it.
    this.inFlightQuery = null
    this.inFlightPush = false
    this.unconfirmed.clear()
    this.syncFromRoute()
  }

  // ---------------------------------------------------------------------------
  // Subscribe — for reactive refs to listen to external route changes
  // ---------------------------------------------------------------------------

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => {
      this.subscribers.delete(fn)
    }
  }

  // ---------------------------------------------------------------------------
  // Sync from route — call this on route changes to invalidate stale cache
  // ---------------------------------------------------------------------------

  syncFromRoute(): void {
    const { query } = this.router.currentRoute.value

    // Invalidate cache entries that differ from the route
    for (const [key, cached] of this.cache) {
      // A write that is still on its way to the URL wins over the route it will replace
      if (this.unconfirmed.has(key)) {
        continue
      }

      const routeValue = query[key]
      const rawRoute = isNullish(routeValue)
        ? null
        : Array.isArray(routeValue)
          ? (routeValue[0] ?? null)
          : isString(routeValue)
            ? routeValue
            : null

      if (rawRoute !== cached) {
        this.cache.set(key, rawRoute)

        // Notify subscribers of external change
        for (const subscriber of this.subscribers) {
          subscriber(key, rawRoute)
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  /** Clear the cache and all pending updates. */
  clear(): void {
    this.cache.clear()
    this.pendingUpdates = []
    this.unconfirmed.clear()
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  /** @internal Record why a key's URL value was not used. Warns once per value in development. */
  reportIssue(key: string, raw: string, issue: QueryIssue, partial = false): void {
    const current = this.issues.get(key)
    if (
      current?.raw !== raw ||
      current.message !== issue.message ||
      current.rule !== issue.rule ||
      current.partial !== partial
    ) {
      // SAFETY: `issues` is created as a mutable map; it is only typed readonly for consumers.
      ;(this.issues as Map<string, QueryKeyIssue>).set(key, { ...issue, raw, partial })
    }
    const signature = `${key}=${raw}:${issue.message}`
    if (isDev && !this.warned.has(signature)) {
      this.warned.add(signature)
      console.warn(
        `[vue-route-query] ?${key}=${raw}${issue.rule ? ` (rule "${issue.rule}")` : ''}: ${issue.message}`,
      )
    }
  }

  /** @internal Forget the issue of a key whose URL value is valid again. */
  clearIssue(key: string): void {
    if (this.issues.has(key)) {
      // SAFETY: see reportIssue.
      ;(this.issues as Map<string, QueryKeyIssue>).delete(key)
    }
  }

  // ---------------------------------------------------------------------------
  // Devtools
  // ---------------------------------------------------------------------------

  /** Subscribe to state changes for devtools. Returns unsubscribe fn. */
  onDevtoolsUpdate(fn: () => void): () => void {
    this.devtoolsListeners.add(fn)
    return () => {
      this.devtoolsListeners.delete(fn)
    }
  }

  /** Record a write for devtools, keeping only the most recent ones. */
  private logMutation(mutation: LoggedMutation): void {
    this.mutationLog.push(mutation)
    if (this.mutationLog.length > MUTATION_LOG_LIMIT) {
      this.mutationLog.shift()
    }
  }

  private notifyDevtools(): void {
    for (const fn of this.devtoolsListeners) {
      fn()
    }
  }

  /** Snapshot of all internal state for devtools inspection. */
  __devtools__() {
    return {
      cache: Object.fromEntries(this.cache),
      issues: Object.fromEntries(this.issues),
      mutationLog: [...this.mutationLog],
      pendingUpdates: [...this.pendingUpdates],
      routeQuery: { ...this.router.currentRoute.value.query },
      subscriberCount: this.subscribers.size,
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queryEquals(a: LocationQuery, b: LocationQuery): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  if (aKeys.length !== bKeys.length) {
    return false
  }

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false
    }
  }

  return true
}
