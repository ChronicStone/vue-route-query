<script setup lang="ts">
import { enumCodec, numberCodec, stringCodec, useQueryStates } from '@chronicstone/vue-route-query'

const props = defineProps<{
  /** Render without the outer frame, for use inside another card. */
  bare?: boolean
}>()

const filters = useQueryStates({
  schema: {
    q: stringCodec({ default: '', trim: true, maxLength: 40 }),
    category: enumCodec(['state', 'routing', 'ui', 'tooling']),
    page: numberCodec({ default: 1, int: true, min: 1 }),
  },
})

const packages = [
  { name: 'pinia', category: 'state' },
  { name: 'vue-router', category: 'routing' },
  { name: 'nuxt', category: 'routing' },
  { name: '@vueuse/core', category: 'state' },
  { name: '@nuxt/ui', category: 'ui' },
  { name: 'reka-ui', category: 'ui' },
  { name: 'vitest', category: 'tooling' },
  { name: 'vite', category: 'tooling' },
  { name: '@tanstack/vue-query', category: 'state' },
  { name: 'motion-v', category: 'ui' },
  { name: 'unplugin-vue-router', category: 'routing' },
  { name: 'vue-tsc', category: 'tooling' },
] as const

const categories = ['state', 'routing', 'ui', 'tooling'] as const
const pageSize = 4

const matches = computed(() => {
  const { q, category } = filters.value
  return packages.filter(
    (item) =>
      (!category || item.category === category) &&
      item.name.toLowerCase().includes(q.trim().toLowerCase()),
  )
})
const pageCount = computed(() => Math.max(1, Math.ceil(matches.value.length / pageSize)))
const rows = computed(() => {
  const start = (filters.value.page - 1) * pageSize
  return matches.value.slice(start, start + pageSize)
})

// A new search or category sends the list back to page 1, in the same navigation.
function update(patch: Partial<typeof filters.value>) {
  filters.value = { ...filters.value, page: 1, ...patch }
}
</script>

<template>
  <div
    class="flex min-w-0 flex-col"
    :class="
      props.bare ? '' : 'not-prose my-6 overflow-hidden rounded-xl border border-default bg-default'
    "
  >
    <DemoUrlBar :keys="['q', 'category', 'page']" />
    <div class="flex flex-col gap-3 p-4">
      <UInput
        :model-value="filters.q"
        placeholder="Search packages"
        icon="i-pixelarticons-search"
        size="sm"
        @update:model-value="update({ q: String($event ?? '') })"
      />
      <div class="flex flex-wrap gap-1.5">
        <UButton
          size="xs"
          :color="!filters.category ? 'primary' : 'neutral'"
          :variant="!filters.category ? 'soft' : 'outline'"
          @click="update({ category: undefined })"
        >
          all
        </UButton>
        <UButton
          v-for="category in categories"
          :key="category"
          size="xs"
          :color="filters.category === category ? 'primary' : 'neutral'"
          :variant="filters.category === category ? 'soft' : 'outline'"
          @click="update({ category })"
        >
          {{ category }}
        </UButton>
      </div>
      <ul class="divide-y divide-default rounded-lg border border-default text-sm">
        <li
          v-for="item in rows"
          :key="item.name"
          class="flex items-center justify-between gap-3 px-3 py-1.5"
        >
          <span class="truncate font-mono text-[13px] text-highlighted">{{ item.name }}</span>
          <span class="text-xs text-muted">{{ item.category }}</span>
        </li>
        <li
          v-for="index in pageSize - rows.length"
          :key="`empty-${index}`"
          class="px-3 py-1.5 text-sm text-transparent select-none"
          aria-hidden="true"
        >
          –
        </li>
      </ul>
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">{{ matches.length }} packages</span>
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-pixelarticons-chevron-left"
            aria-label="Previous page"
            :disabled="filters.page <= 1"
            @click="filters = { ...filters, page: filters.page - 1 }"
          />
          <span class="font-mono text-xs text-muted tabular-nums"
            >{{ filters.page }} / {{ pageCount }}</span
          >
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-pixelarticons-chevron-right"
            aria-label="Next page"
            :disabled="filters.page >= pageCount"
            @click="filters = { ...filters, page: filters.page + 1 }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
