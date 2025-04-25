<template>
    <div class="space-y-8">
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Complex Filters Example</h2>
            </template>

            <div class="space-y-6">
                <UFormField label="Search">
                    <UInput v-model="filters.search" placeholder="Search..." />
                </UFormField>

                <div class="grid grid-cols-2 gap-4">
                    <UFormField label="Status">
                        <USelectMenu v-model="filters.status" :items="statusOptions" multiple value-key="value"
                            class="w-full" />
                    </UFormField>

                    <UFormField label="Categories">
                        <USelectMenu v-model="filters.categories" :items="categoryOptions" value-key="value" multiple
                            class="w-full" />
                    </UFormField>
                </div>

                <UFormField label="Date Range">
                    <div class="grid grid-cols-2 gap-4">
                        <UInput v-model="filters.dateRange.from" type="date" placeholder="From" />
                        <UInput v-model="filters.dateRange.to" type="date" placeholder="To" />
                    </div>
                </UFormField>

                <UFormField label="Options">
                    <div class="flex gap-4">
                        <UCheckbox v-model="filters.options.includeArchived" label="Include Archived" />
                        <UCheckbox v-model="filters.options.onlyFavorites" label="Only Favorites" />
                    </div>
                </UFormField>

                <USeparator label="Current State" />

                <pre
                    class="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">{{ JSON.stringify(filters, null, 2) }}</pre>

                <USeparator />

                <div class="flex gap-4">
                    <UButton @click="resetToDefaults" variant="soft">
                        Reset to Defaults
                    </UButton>
                    <UButton @click="setExampleFilters" color="primary">
                        Set Example Filters
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

<script setup lang="ts">
import { z } from 'zod'
import { useRouteQuery } from "../../../src"

const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' }
]

const categoryOptions = [
    { label: 'Work', value: 'work' },
    { label: 'Personal', value: 'personal' },
    { label: 'Shopping', value: 'shopping' },
    { label: 'Health', value: 'health' },
    { label: 'Education', value: 'education' }
]

const filters = useRouteQuery({
    schema: {
        search: z.string(),
        status: z.array(z.string()),
        categories: z.array(z.string()),
        dateRange: z.object({
            from: z.string(),
            to: z.string()
        }),
        options: z.object({
            includeArchived: z.boolean(),
            onlyFavorites: z.boolean()
        })
    },
    default: {
        search: '',
        status: [],
        categories: [],
        dateRange: { from: '', to: '' },
        options: { includeArchived: false, onlyFavorites: false }
    },
})

const resetToDefaults = () => {
    filters.value = {
        search: '',
        status: [],
        categories: [],
        dateRange: { from: '', to: '' },
        options: { includeArchived: false, onlyFavorites: false }
    }
}

const setExampleFilters = () => {
    filters.value = {
        search: 'example search',
        status: ['active', 'pending'],
        categories: ['work', 'personal'],
        dateRange: {
            from: '2024-01-01',
            to: '2024-12-31'
        },
        options: {
            includeArchived: true,
            onlyFavorites: false
        }
    }
}

const currentUrl = computed(() => {
    if (process.client) {
        return window.location.href
    }
    return ''
})
</script>