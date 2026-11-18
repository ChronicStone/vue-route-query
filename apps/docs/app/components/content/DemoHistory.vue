<script setup lang="ts">
import { numberCodec, useQueryState } from '@chronicstone/vue-route-query'

const replaced = useQueryState('replaced', numberCodec({ default: 0 }))
const pushed = useQueryState('pushed', numberCodec({ default: 0, historyMode: 'push' }))

const router = useRouter()
</script>

<template>
  <DemoShell :keys="['replaced', 'pushed']" label="Click both a few times, then press Back.">
    <div class="grid gap-3 sm:grid-cols-2">
      <div
        class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2"
      >
        <div>
          <p class="font-mono text-xs text-muted">historyMode: 'replace'</p>
          <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">
            {{ replaced }}
          </p>
        </div>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-pixelarticons-plus"
          aria-label="Increment replaced"
          @click="replaced++"
        />
      </div>
      <div
        class="flex items-center justify-between gap-3 rounded-lg border border-primary/40 px-3 py-2"
      >
        <div>
          <p class="font-mono text-xs text-primary">historyMode: 'push'</p>
          <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">{{ pushed }}</p>
        </div>
        <UButton
          size="sm"
          icon="i-pixelarticons-plus"
          aria-label="Increment pushed"
          @click="pushed++"
        />
      </div>
    </div>
    <div>
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-pixelarticons-arrow-left"
        @click="router.back()"
      >
        Back
      </UButton>
    </div>
  </DemoShell>
</template>
