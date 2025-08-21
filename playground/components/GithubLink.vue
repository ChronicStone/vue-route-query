<script setup lang="ts">
const route = useRoute()

const link = computed(() =>
    `https://github.com/ChronicStone/vue-route-query/blob/main/playground/pages${route.path}.vue`
)
</script>

<template>
    <NuxtLink external :to="link" target="_blank">
        <UTooltip text="Open on GitHub" :delay-duration="0">
            <UButton color="neutral" trailing-icon="lucide:github" size="md" />
        </UTooltip>
    </NuxtLink>
</template>