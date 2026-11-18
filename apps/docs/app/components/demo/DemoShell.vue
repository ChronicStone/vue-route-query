<script setup lang="ts">
defineProps<{
  keys: string[]
  label?: string
}>()
</script>

<template>
  <div
    class="demo-shell not-prose my-6 overflow-hidden rounded-xl border border-default bg-default"
  >
    <DemoUrlBar :keys="keys" />
    <div class="flex flex-col gap-4 p-4 sm:p-5">
      <slot />
    </div>
    <div
      v-if="$slots.footer || label"
      class="flex items-center gap-2 border-t border-default bg-elevated/40 px-3 py-2 text-xs text-muted"
    >
      <UIcon name="i-pixelarticons-mouse" class="size-3.5 shrink-0" />
      <slot name="footer">{{ label }}</slot>
    </div>
  </div>
</template>
