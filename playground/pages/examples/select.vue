<template>
    <div class="space-y-8">
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Select & Multi-Select Example</h2>
            </template>

            <div class="space-y-6">
                <UFormField label="Theme">
                    <USelectMenu v-model="theme" :options="themeOptions" value-attribute="value"
                        option-attribute="label" />
                </UFormField>

                <UFormField label="Tags (Multi-select)">
                    <USelectMenu v-model="tags" :options="tagOptions" multiple value-attribute="value"
                        option-attribute="label" />
                </UFormField>

                <UFormField label="View Mode">
                    <URadioGroup v-model="viewMode" :options="viewModeOptions" value-attribute="value"
                        option-attribute="label" />
                </UFormField>

                <USeparator label="Current State" />

                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <h3 class="font-medium mb-2">Theme</h3>
                        <UBadge color="primary" variant="soft">{{ theme }}</UBadge>
                    </div>
                    <div>
                        <h3 class="font-medium mb-2">Tags</h3>
                        <div class="flex flex-wrap gap-2">
                            <UBadge v-for="tag in tags" :key="tag" color="primary" variant="soft">
                                {{ tag }}
                            </UBadge>
                            <UBadge v-if="tags.length === 0" color="neutral" variant="soft">
                                (none)
                            </UBadge>
                        </div>
                    </div>
                    <div>
                        <h3 class="font-medium mb-2">View Mode</h3>
                        <UBadge color="primary" variant="soft">{{ viewMode }}</UBadge>
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
            <code class="text-sm">{{ currentUrl }}</code>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useRouteQuery } from "../../../src"

const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' }
]

const tagOptions = [
    { label: 'Vue', value: 'vue' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Nuxt', value: 'nuxt' },
    { label: 'TailwindCSS', value: 'tailwind' },
    { label: 'JavaScript', value: 'javascript' }
]

const viewModeOptions = [
    { label: 'Grid', value: 'grid' },
    { label: 'List', value: 'list' },
    { label: 'Compact', value: 'compact' }
]

const theme = useRouteQuery({
    key: 'theme',
    schema: z.enum(['light', 'dark', 'system']),
    default: 'system'
})

const tags = useRouteQuery({
    key: 'tags',
    schema: z.array(z.string()),
    default: []
})

const viewMode = useRouteQuery({
    key: 'view',
    schema: z.enum(['grid', 'list', 'compact']),
    default: 'list'
})

const resetToDefaults = () => {
    theme.value = 'system'
    tags.value = []
    viewMode.value = 'list'
}

const setCustomValues = () => {
    theme.value = 'dark'
    tags.value = ['vue', 'typescript', 'nuxt']
    viewMode.value = 'grid'
}

const currentUrl = computed(() => {
    if (process.client) {
        return window.location.href
    }
    return ''
})
</script>