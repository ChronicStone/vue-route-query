<script setup lang="ts">
const props = defineProps<{
  /** Query keys (or key prefixes, matched as `prefix.`) this demo owns. */
  keys: string[]
}>()

const route = useRoute()
const router = useRouter()

function owns(key: string) {
  return props.keys.some((owned) => key === owned || key.startsWith(`${owned}.`))
}

const entries = computed(() =>
  Object.entries(route.query)
    .filter(([key]) => owns(key))
    .flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).map((item) => ({ key, value: item ?? '' })),
    ),
)

function reset() {
  const query = Object.fromEntries(Object.entries(route.query).filter(([key]) => !owns(key)))
  router.replace({ query })
}
</script>

<template>
  <div class="demo-url flex min-w-0 items-center gap-2 border-b border-default px-3 py-2">
    <UIcon name="i-pixelarticons-link" class="size-3.5 shrink-0 text-dimmed" />
    <div class="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-5 whitespace-nowrap">
      <span class="text-dimmed">{{ route.path }}</span>
      <template v-if="entries.length">
        <template v-for="(entry, index) in entries" :key="`${entry.key}-${index}`">
          <span class="text-dimmed">{{ index === 0 ? '?' : '&' }}</span>
          <span class="text-primary">{{ entry.key }}</span>
          <span class="text-dimmed">=</span>
          <span class="text-highlighted">{{ entry.value }}</span>
        </template>
      </template>
    </div>
    <UButton
      v-if="entries.length"
      size="xs"
      color="neutral"
      variant="ghost"
      icon="i-pixelarticons-reload"
      aria-label="Clear these keys from the URL"
      @click="reset"
    />
  </div>
</template>
