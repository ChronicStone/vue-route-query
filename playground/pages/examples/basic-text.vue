<script setup lang="ts">
import { z } from 'zod'
import { useRouteQuery } from "../../../src"

const searchQuery = useRouteQuery({
    key: 'q',
    schema: z.string(),
    default: ''
})

const username = useRouteQuery({
    key: 'user',
    schema: z.string(),
    default: ''
})

const resetToDefaults = () => {
    searchQuery.value = ''
    username.value = ''
}

const setCustomValues = () => {
    searchQuery.value = 'example search'
    username.value = 'john_doe'
}

const currentUrl = computed(() => {
    if (process.client) {
        return window.location.href
    }
    return ''
})
</script>

<template>
    <div class="space-y-8">
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Basic Text Input Example</h2>
            </template>

            <div class="space-y-6">
                <UFormField label="Search Query">
                    <UInput v-model="searchQuery" placeholder="Type something..." />
                </UFormField>

                <UFormField label="Username">
                    <UInput v-model="username" placeholder="Enter username..." />
                </UFormField>

                <USeparator label="Current State" />

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h3 class="font-medium mb-2">Search Query</h3>
                        <UBadge color="primary" variant="soft">{{ searchQuery || '(empty)' }}</UBadge>
                    </div>
                    <div>
                        <h3 class="font-medium mb-2">Username</h3>
                        <UBadge color="primary" variant="soft">{{ username || '(empty)' }}</UBadge>
                    </div>
                </div>

                <USeparator />

                <div class="flex gap-4">
                    <UButton @click="resetToDefaults" variant="soft">
                        Reset to Defaults
                    </UButton>
                    <UButton @click="setCustomValues" color="primary">
                        Set Custom Values
                    </UButton>
                </div>
            </div>
        </UCard>

        <UCard>
            <template #header>
                <h3 class="font-semibold">Current URL</h3>
            </template>
            <code class="text-sm">{{ $router.currentRoute.value.fullPath }}</code>
        </UCard>
    </div>
</template>