<template>
    <UCard>
        <template #header>
            <h2 class="text-xl font-semibold">Welcome to the Vue Route Query Playground</h2>
        </template>

        <div class="space-y-4">
            <p>This playground demonstrates various use cases of the <code class="text-primary">useRouteQuery</code>
                composable.
            </p>

            <UAlert color="primary" variant="subtle" title="About this playground"
                description="Navigate through examples using the tabs above to see different features in action. Watch how the URL changes as you interact with the forms!" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <UCard v-for="example in examples" :key="example.to">
                    <div class="space-y-2">
                        <h3 class="font-semibold">{{ example.title }}</h3>
                        <p class="text-sm text-gray-600">{{ example.description }}</p>
                        <UButton :to="example.to" color="primary" variant="soft" size="sm">
                            View Example
                        </UButton>
                    </div>
                </UCard>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
const examples = [
    {
        title: 'Basic Text Input',
        description: 'Simple text input that syncs with URL query parameters',
        to: '/examples/basic-text'
    },
    {
        title: 'Select & Multi-select',
        description: 'Single and multiple selection with array serialization',
        to: '/examples/select'
    },
    {
        title: 'Complex Filters',
        description: 'Advanced filtering system with nested objects',
        to: '/examples/filters'
    },
    {
        title: 'Pagination & Mode',
        description: 'Pagination controls with push/replace mode demonstration',
        to: '/examples/pagination'
    },
    {
        title: 'Nested Objects',
        description: 'Deep object structures with dot notation',
        to: '/examples/nested'
    },
    {
        title: 'Nullable Schema',
        description: 'Schemas that can be null with toggling',
        to: '/examples/nullable'
    }
]
</script>