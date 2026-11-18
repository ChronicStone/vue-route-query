<script setup lang="ts">
import { stringCodec, useQueryState } from '@chronicstone/vue-route-query'

const name = useQueryState('name', stringCodec({ default: '' }))
</script>

<template>
  <DemoShell :keys="['name']" label="Type, then reload the page or share the link.">
    <UInput v-model="name" placeholder="Your name" icon="i-pixelarticons-user" class="max-w-xs" />
    <p class="text-2xl font-semibold tracking-tight text-highlighted">
      Hello, {{ name || 'anonymous visitor' }}!
    </p>
  </DemoShell>
</template>
