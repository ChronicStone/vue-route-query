<script setup lang="ts">
import { numberCodec, useQueryState } from '@chronicstone/vue-route-query'

const x = useQueryState('x', numberCodec({ default: 0 }))
const y = useQueryState('y', numberCodec({ default: 0 }))
const z = useQueryState('z', numberCodec({ default: 0 }))

const router = useRouter()
const writes = ref(0)
const log = ref<{ id: number; query: string }[]>([])
let nextId = 0

function ownedQuery(query: Record<string, unknown>) {
  return ['x', 'y', 'z']
    .filter((key) => query[key] !== undefined)
    .map((key) => `${key}=${query[key]}`)
    .join('&')
}

const stop = router.afterEach((to, from, failure) => {
  if (failure) return
  const before = ownedQuery(from.query)
  const after = ownedQuery(to.query)
  if (before === after) return
  log.value = [{ id: nextId++, query: after ? `?${after}` : '(keys removed)' }, ...log.value].slice(
    0,
    5,
  )
})
onScopeDispose(stop)

const roll = () => Math.floor(Math.random() * 9) + 1

function writeTogether() {
  writes.value += 3
  x.value = roll()
  y.value = roll()
  z.value = roll()
}

async function writeApart() {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 60))
  writes.value += 3
  x.value = roll()
  await tick()
  y.value = roll()
  await tick()
  z.value = roll()
}

function clear() {
  writes.value = 0
  log.value = []
}
</script>

<template>
  <DemoShell :keys="['x', 'y', 'z']">
    <div class="flex flex-wrap items-center gap-2">
      <UButton size="sm" icon="i-pixelarticons-zap" @click="writeTogether"
        >Write 3 keys in one tick</UButton
      >
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-pixelarticons-clock"
        @click="writeApart"
      >
        Write 3 keys, 60 ms apart
      </UButton>
      <UButton size="sm" color="neutral" variant="ghost" @click="clear">Clear log</UButton>
    </div>
    <div class="grid gap-3 sm:grid-cols-[auto_1fr]">
      <div class="flex gap-3 sm:flex-col">
        <div class="demo-stat">
          <span class="demo-stat-value">{{ writes }}</span>
          <span class="demo-stat-label">ref writes</span>
        </div>
        <div class="demo-stat">
          <span class="demo-stat-value text-primary">{{ log.length }}</span>
          <span class="demo-stat-label">navigations</span>
        </div>
      </div>
      <ol
        class="min-h-28 divide-y divide-default rounded-lg border border-default font-mono text-xs"
      >
        <li v-if="!log.length" class="px-3 py-2 text-dimmed">Navigations appear here.</li>
        <li v-for="(entry, index) in log" :key="entry.id" class="flex gap-3 px-3 py-1.5">
          <span class="text-dimmed">router.replace</span>
          <span :class="index === 0 ? 'text-highlighted' : 'text-muted'">{{ entry.query }}</span>
        </li>
      </ol>
    </div>
    <template #footer
      >Writes made in the same tick, from any component, become one navigation.</template
    >
  </DemoShell>
</template>
