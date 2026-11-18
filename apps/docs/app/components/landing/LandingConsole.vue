<script setup lang="ts">
import {
  arrayCodec,
  enumCodec,
  numberCodec,
  stringCodec,
  useQueryStateClient,
  useQueryStates,
} from '@chronicstone/vue-route-query'

const allTags = ['vue', 'nuxt', 'router', 'ts'] as const

const state = useQueryStates({
  schema: {
    q: stringCodec({ default: '', trim: true, maxLength: 40 }),
    view: enumCodec(['list', 'grid'], { default: 'list' }),
    page: numberCodec({ default: 1, int: true, min: 1, max: 99 }),
    tags: arrayCodec(enumCodec(allTags), { default: [], invalidItems: 'drop' }),
  },
})

const types: Record<string, string> = {
  q: 'string',
  view: "'list' | 'grid'",
  page: 'number',
  tags: 'tag[]',
}

const client = useQueryStateClient()

const route = useRoute()
const router = useRouter()

// ── Counters ──────────────────────────────────────────────
const writes = ref(0)
const navigations = ref(0)

const stop = router.afterEach((to, from, failure) => {
  if (failure || to.path !== from.path) return
  if (JSON.stringify(to.query) !== JSON.stringify(from.query)) navigations.value++
})
onScopeDispose(stop)

function write(patch: Partial<typeof state.value>) {
  writes.value += Object.keys(patch).length
  state.value = { ...state.value, ...patch }
}

// ── Address bar: the real query string of this page ───────
function toQueryString(query: typeof route.query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item ?? '')
  }
  return decodeURIComponent(params.toString())
}

const address = ref(toQueryString(route.query))
const editing = ref(false)

watch(
  () => route.query,
  (query) => {
    if (!editing.value) address.value = toQueryString(query)
  },
)

// Typing edits the text only; the URL changes after a short pause, on Enter, or on blur,
// so a half-typed key is not a navigation (and not a rejected value) per keystroke.
let commitTimer: ReturnType<typeof setTimeout> | undefined

function commitAddress() {
  clearTimeout(commitTimer)
  const query: Record<string, string> = {}
  for (const [key, item] of new URLSearchParams(address.value.replace(/^\?/, ''))) {
    if (!(key in query)) query[key] = item
  }
  if (toQueryString(query) !== toQueryString(route.query)) {
    router.replace({ query })
  }
}

function onAddressInput(value: string) {
  address.value = value
  clearTimeout(commitTimer)
  commitTimer = setTimeout(commitAddress, 400)
}

function onAddressBlur() {
  commitAddress()
  editing.value = false
  address.value = toQueryString(route.query)
}

onScopeDispose(() => clearTimeout(commitTimer))

// ── Parsed rows ───────────────────────────────────────────
function format(value: unknown): string {
  if (typeof value === 'string') return `'${value}'`
  if (Array.isArray(value)) return `[${value.map(format).join(', ')}]`
  return String(value)
}

const rows = computed(() =>
  Object.entries(route.query).map(([key, value]) => {
    const raw = String((Array.isArray(value) ? value[0] : value) ?? '')
    const type = types[key]
    if (!type) {
      return {
        key,
        raw,
        typed: '-',
        type: 'not bound',
        issue: undefined,
        partial: false,
        bound: false,
      }
    }
    // The client records why a URL value was rejected or only partly used.
    const issue = client.issues.get(key)
    return {
      key,
      raw,
      typed: format(state.value[key as keyof typeof state.value]),
      type,
      issue: issue?.message,
      partial: issue?.partial ?? false,
      bound: true,
    }
  }),
)

const rejectedCount = computed(() => rows.value.filter((row) => row.issue).length)
</script>

<template>
  <div class="console flex min-w-0 flex-col bg-[var(--vrq-panel)]">
    <div
      class="flex h-10 items-center justify-between gap-3 border-b border-default px-4 font-mono text-xs text-muted"
    >
      <span>packages.vue</span>
      <span class="flex items-center gap-2 text-primary">
        <span class="console-live size-1.5 bg-primary" aria-hidden="true" />
        bound to this page's URL
      </span>
    </div>

    <label class="console-address flex h-13 min-w-0 items-center border-b border-default px-4">
      <span class="shrink-0 font-mono text-sm text-dimmed">/?</span>
      <input
        :value="address"
        spellcheck="false"
        autocomplete="off"
        aria-label="Query string of this page"
        placeholder="type a query, e.g. q=vue&page=2"
        class="h-full min-w-0 flex-1 bg-transparent font-mono text-sm text-highlighted outline-none placeholder:text-dimmed"
        @focus="editing = true"
        @blur="onAddressBlur"
        @input="onAddressInput(($event.target as HTMLInputElement).value)"
        @keydown.enter="commitAddress"
      />
      <span class="hidden shrink-0 font-mono text-[11px] text-dimmed sm:inline">edit me</span>
    </label>

    <div class="grid grid-cols-1 border-b border-default sm:grid-cols-[minmax(0,1fr)_auto]">
      <div class="console-cell border-b border-default sm:border-r sm:border-b-0">
        <span class="console-label">q · stringCodec({ maxLength: 40 })</span>
        <UInput
          :model-value="state.q"
          placeholder="Search"
          icon="i-pixelarticons-search"
          size="sm"
          class="w-full"
          @update:model-value="write({ q: String($event ?? ''), page: 1 })"
        />
      </div>
      <div class="console-cell">
        <span class="console-label">view · enumCodec</span>
        <div class="flex">
          <button
            v-for="option in ['list', 'grid'] as const"
            :key="option"
            type="button"
            class="console-seg"
            :class="{ 'is-on': state.view === option }"
            @click="write({ view: option })"
          >
            <UIcon
              :name="option === 'list' ? 'i-pixelarticons-list' : 'i-pixelarticons-grid'"
              class="size-4"
            />
            {{ option }}
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 border-b border-default sm:grid-cols-[auto_minmax(0,1fr)]">
      <div class="console-cell border-b border-default sm:border-r sm:border-b-0">
        <span class="console-label">page · numberCodec({ min: 1, max: 99 })</span>
        <div class="flex">
          <button
            type="button"
            class="console-step"
            aria-label="Previous page"
            :disabled="state.page <= 1"
            @click="write({ page: state.page - 1 })"
          >
            <UIcon name="i-pixelarticons-chevron-left" class="size-4" />
          </button>
          <span class="console-page font-pixel">{{ state.page }}</span>
          <button
            type="button"
            class="console-step"
            aria-label="Next page"
            :disabled="state.page >= 99"
            @click="write({ page: state.page + 1 })"
          >
            <UIcon name="i-pixelarticons-chevron-right" class="size-4" />
          </button>
        </div>
      </div>
      <div class="console-cell">
        <span class="console-label">tags · arrayCodec({ invalidItems: 'drop' })</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tag in allTags"
            :key="tag"
            type="button"
            class="console-tag"
            :class="{ 'is-on': state.tags.includes(tag) }"
            @click="
              write({
                tags: state.tags.includes(tag)
                  ? state.tags.filter((item) => item !== tag)
                  : [...state.tags, tag],
              })
            "
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <table class="console-table">
      <colgroup>
        <col class="w-[18%]" />
        <col class="w-[26%]" />
        <col class="w-[30%]" />
        <col class="w-[26%]" />
      </colgroup>
      <thead>
        <tr>
          <th>key</th>
          <th>in the URL</th>
          <th>typed value</th>
          <th>type</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td colspan="4" class="console-empty">
            The URL has no keys, so every ref holds its default. Type in the bar above, or use the
            controls.
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="row.key"
          :class="{ 'is-rejected': row.issue && !row.partial, 'is-partial': row.partial }"
        >
          <td :class="row.bound ? 'console-key' : 'console-key is-unbound'">{{ row.key }}</td>
          <td class="console-raw" :title="row.raw">{{ row.raw || '(empty)' }}</td>
          <td class="console-typed">
            <span class="console-value" :title="row.typed">{{ row.typed }}</span>
            <span v-if="row.issue" class="console-flag">{{ row.issue }}</span>
          </td>
          <td class="console-type" :title="row.type">{{ row.type }}</td>
        </tr>
      </tbody>
    </table>

    <div class="mt-auto grid grid-cols-3 border-t border-default">
      <div class="console-stat border-r border-default">
        <b class="font-pixel">{{ writes }}</b>
        <span>ref writes</span>
      </div>
      <div class="console-stat border-r border-default">
        <b class="font-pixel text-primary">{{ navigations }}</b>
        <span>navigations</span>
      </div>
      <div class="console-stat">
        <b class="font-pixel" :class="rejectedCount ? 'text-[var(--vrq-warn)]' : ''">{{
          rejectedCount
        }}</b>
        <span>issues</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.console-address:focus-within {
  box-shadow: inset 0 -2px 0 var(--ui-primary);
}

.console-live {
  animation: console-blink 1.2s steps(2) infinite;
}

@keyframes console-blink {
  50% {
    opacity: 0.2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .console-live {
    animation: none;
  }
}

.console-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
}

.console-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ui-text-dimmed);
}

.console-seg,
.console-step {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid var(--ui-border-accented);
  background: var(--ui-bg);
  padding: 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ui-text-muted);
  transition:
    background 0.15s,
    color 0.15s;
}

.console-seg + .console-seg {
  border-left: 0;
}

.console-seg.is-on {
  border-color: var(--ui-text-highlighted);
  background: var(--ui-text-highlighted);
  color: var(--ui-bg);
}

.console-step {
  width: 2rem;
  justify-content: center;
  padding: 0;
  color: var(--ui-text-highlighted);
}

.console-step:disabled {
  color: var(--ui-text-dimmed);
}

.console-seg:active,
.console-step:active:not(:disabled),
.console-tag:active {
  transform: translateY(1px);
}

.console-page {
  display: grid;
  height: 2rem;
  min-width: 3rem;
  place-items: center;
  border-block: 1px solid var(--ui-border-accented);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.console-tag {
  height: 1.75rem;
  border: 1px dashed var(--ui-border-accented);
  padding: 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ui-text-muted);
}

.console-tag.is-on {
  border-style: solid;
  border-color: var(--ui-primary);
  background: color-mix(in oklab, var(--ui-primary) 12%, transparent);
  color: var(--ui-primary);
}

.console-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 13px;
}

.console-table th {
  border-bottom: 1px solid var(--ui-border);
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 11px;
  font-weight: 400;
  color: var(--ui-text-dimmed);
}

.console-table td {
  overflow: hidden;
  border-bottom: 1px solid var(--ui-border);
  padding: 0.5rem 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}

.console-table tr:last-child td {
  border-bottom: 0;
}

.console-table td.console-key {
  color: var(--ui-primary);
}

.console-table td.console-key.is-unbound,
.console-table td.console-type {
  color: var(--ui-text-dimmed);
}

.console-table td.console-raw {
  color: var(--ui-text-muted);
}

.console-table td.console-empty {
  white-space: normal;
  color: var(--ui-text-dimmed);
}

/* The reason sits under the typed value and wraps, so it is never cut off. */
.console-table td.console-typed {
  white-space: normal;
}

.console-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-rejected td.console-raw {
  color: var(--vrq-warn);
  text-decoration: line-through;
}

.is-partial td.console-raw {
  color: var(--vrq-warn);
}

.console-flag {
  display: inline-block;
  margin-top: 0.25rem;
  background: var(--vrq-warn-bg);
  padding: 1px 5px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--vrq-warn);
}

.console-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
}

.console-stat b {
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
}

.console-stat span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ui-text-dimmed);
}

@media (max-width: 640px) {
  .console-table col:nth-child(4),
  .console-table th:nth-child(4),
  .console-table td:nth-child(4) {
    display: none;
  }
}
</style>
