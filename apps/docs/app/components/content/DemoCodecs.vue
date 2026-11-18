<script setup lang="ts">
import {
  arrayCodec,
  booleanCodec,
  enumCodec,
  numberCodec,
  stringCodec,
  useQueryState,
} from '@chronicstone/vue-route-query'

const count = useQueryState('count', numberCodec({ default: 0, int: true, min: 0, max: 10 }))
const compact = useQueryState('compact', booleanCodec({ default: false }))
const view = useQueryState('view', enumCodec(['list', 'grid', 'board'], { default: 'list' }))
const tags = useQueryState(
  'tags',
  arrayCodec(enumCodec(['vue', 'nuxt', 'router', 'typescript']), {
    default: [],
    invalidItems: 'drop',
  }),
)

const views = ['list', 'grid', 'board'] as const
const allTags = ['vue', 'nuxt', 'router', 'typescript'] as const

function toggleTag(tag: (typeof allTags)[number]) {
  tags.value = tags.value.includes(tag)
    ? tags.value.filter((item) => item !== tag)
    : [...tags.value, tag]
}

const value = computed(() =>
  JSON.stringify(
    { count: count.value, compact: compact.value, view: view.value, tags: tags.value },
    null,
    2,
  ),
)
</script>

<template>
  <DemoShell
    :keys="['count', 'compact', 'view', 'tags']"
    label="Each control is one useQueryState with a different codec."
  >
    <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
      <div class="flex flex-col gap-3">
        <div class="demo-row">
          <span class="demo-label">numberCodec 0..10</span>
          <UFieldGroup size="sm">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-pixelarticons-minus"
              aria-label="Decrement"
              :disabled="count <= 0"
              @click="count--"
            />
            <UButton
              color="neutral"
              variant="outline"
              class="min-w-12 justify-center font-mono tabular-nums"
              >{{ count }}</UButton
            >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-pixelarticons-plus"
              aria-label="Increment"
              :disabled="count >= 10"
              @click="count++"
            />
          </UFieldGroup>
        </div>
        <div class="demo-row">
          <span class="demo-label">booleanCodec</span>
          <USwitch v-model="compact" label="Compact" size="sm" />
        </div>
        <div class="demo-row">
          <span class="demo-label">enumCodec</span>
          <UFieldGroup size="sm">
            <UButton
              v-for="option in views"
              :key="option"
              :color="view === option ? 'primary' : 'neutral'"
              :variant="view === option ? 'soft' : 'outline'"
              @click="view = option"
            >
              {{ option }}
            </UButton>
          </UFieldGroup>
        </div>
        <div class="demo-row">
          <span class="demo-label">arrayCodec</span>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="tag in allTags"
              :key="tag"
              size="xs"
              :color="tags.includes(tag) ? 'primary' : 'neutral'"
              :variant="tags.includes(tag) ? 'soft' : 'outline'"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </UButton>
          </div>
        </div>
      </div>
      <pre class="demo-json">{{ value }}</pre>
    </div>
  </DemoShell>
</template>
