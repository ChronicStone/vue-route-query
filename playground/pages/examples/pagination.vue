<template>
    <div class="space-y-8">
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Pagination & Mode Example</h2>
            </template>

            <div class="space-y-6">
                <UFormField label="Navigation Mode">
                    <URadioGroup v-model="selectedMode" :items="modeOptions" value-key="value" />
                </UFormField>

                <UAlert :title="`Current mode: ${selectedMode}`" :description="selectedMode === 'push'
                    ? 'Each change creates a new history entry (back button works)'
                    : 'Updates replace the current URL without creating history'"
                    :color="selectedMode === 'push' ? 'primary' : 'gray'" />

                <USeparator label="Pagination Controls" />

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <UFormField label="Page Size">
                            <USelect v-model="pagination.pageSize" :items="pageSizeOptions" value-key="value" />
                        </UFormField>
                    </div>

                    <UPagination v-model:page="pagination.page" :items-per-page="pagination.pageSize" :total="100" />
                </div>

                <USeparator label="Current State" />

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h3 class="font-medium mb-2">Page</h3>
                        <UBadge color="primary" variant="soft">{{ pagination.page }}</UBadge>
                    </div>
                    <div>
                        <h3 class="font-medium mb-2">Page Size</h3>
                        <UBadge color="primary" variant="soft">{{ pagination.pageSize }}</UBadge>
                    </div>
                </div>

                <USeparator />

                <div class="flex gap-4">
                    <UButton @click="resetToDefaults" variant="soft">
                        Reset to Defaults
                    </UButton>
                    <UButton @click="pagination.page = 5" color="primary">
                        Go to Page 5
                    </UButton>
                </div>

                <UAlert color="primary" variant="subtle" title="Try navigating with browser back/forward"
                    description="If you're using 'push' mode, you can use your browser's back and forward buttons to navigate through your pagination history." />
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

const modeOptions = [
    { label: 'Replace (Default)', value: 'replace' },
    { label: 'Push (History)', value: 'push' }
]

const pageSizeOptions = [10, 20, 50, 100]

const selectedMode = ref<'push' | 'replace'>('push')

const pagination = useRouteQuery({
    schema: {
        page: z.number(),
        pageSize: z.number()
    },
    default: {
        page: 1,
        pageSize: 20
    },
    mode: selectedMode.value
})


const resetToDefaults = () => {
    pagination.value = {
        page: 1,
        pageSize: 20
    }
}

const currentUrl = computed(() => {
    if (process.client) {
        return window.location.href
    }
    return ''
})
</script>