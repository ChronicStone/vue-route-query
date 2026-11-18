<script setup lang="ts">
import { numberCodec, useQueryStates } from '@chronicstone/vue-route-query'

const pagination = useQueryStates({
  prefix: 'users',
  schema: {
    page: numberCodec({ default: 1, int: true, min: 1 }),
    size: numberCodec({ default: 5, int: true, min: 5, max: 20, outOfRange: 'clamp' }),
  },
})

const people = [
  'Ada Lovelace',
  'Alan Turing',
  'Grace Hopper',
  'Linus Torvalds',
  'Margaret Hamilton',
  'Ken Thompson',
  'Barbara Liskov',
  'Dennis Ritchie',
  'Evan You',
  'Anders Hejlsberg',
  'Radia Perlman',
  'Donald Knuth',
  'Frances Allen',
  'John McCarthy',
  'Sophie Wilson',
  'Guido van Rossum',
  'Katherine Johnson',
  'Tim Berners-Lee',
  'Hedy Lamarr',
  'Bjarne Stroustrup',
  'Adele Goldberg',
  'Edsger Dijkstra',
  'Jean Sammet',
]

const pageCount = computed(() => Math.max(1, Math.ceil(people.length / pagination.value.size)))
const rows = computed(() => {
  const { page, size } = pagination.value
  return people.slice((page - 1) * size, page * size)
})

function goTo(page: number) {
  pagination.value = { ...pagination.value, page }
}

function setSize(size: number) {
  // Both keys change in one assignment, so the URL changes once.
  pagination.value = { page: 1, size }
}
</script>

<template>
  <DemoShell
    :keys="['users']"
    label="Changing the page size also resets the page, in one navigation."
  >
    <ol class="divide-y divide-default rounded-lg border border-default text-sm">
      <li v-for="(person, index) in rows" :key="person" class="flex items-center gap-3 px-3 py-1.5">
        <span class="w-6 font-mono text-xs text-dimmed tabular-nums">
          {{ (pagination.page - 1) * pagination.size + index + 1 }}
        </span>
        <span class="text-highlighted">{{ person }}</span>
      </li>
    </ol>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UFieldGroup size="sm">
        <UButton
          v-for="size in [5, 10, 20]"
          :key="size"
          :color="pagination.size === size ? 'primary' : 'neutral'"
          :variant="pagination.size === size ? 'soft' : 'outline'"
          @click="setSize(size)"
        >
          {{ size }} / page
        </UButton>
      </UFieldGroup>
      <div class="flex items-center gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-pixelarticons-chevron-left"
          aria-label="Previous page"
          :disabled="pagination.page <= 1"
          @click="goTo(pagination.page - 1)"
        />
        <span class="font-mono text-xs text-muted tabular-nums"
          >{{ pagination.page }} / {{ pageCount }}</span
        >
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-pixelarticons-chevron-right"
          aria-label="Next page"
          :disabled="pagination.page >= pageCount"
          @click="goTo(pagination.page + 1)"
        />
      </div>
    </div>
  </DemoShell>
</template>
