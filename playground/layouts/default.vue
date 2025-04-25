<template>
    <div class="min-h-screen bg-gray-50">
        <UContainer class="py-8">
            <UCard class="mb-8">
                <template #header>
                    <h1 class="text-2xl font-bold">Vue Route Query Playground</h1>
                </template>
                <UBreadcrumb :links="breadcrumbLinks" class="mb-4" />
                <UTabs :items="navItems" v-model="activeTab" />
            </UCard>

            <slot />
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const router = useRouter()
const navItems = [
    {
        label: 'Home',
        to: '/'
    },
    {
        label: 'Basic Text Input',
        to: '/examples/basic-text'
    },
    {
        label: 'Select & Multi-select',
        to: '/examples/select'
    },
    {
        label: 'Complex Filters',
        to: '/examples/filters'
    },
    {
        label: 'Pagination & Mode',
        to: '/examples/pagination'
    },
    {
        label: 'Nested Objects',
        to: '/examples/nested'
    },
    {
        label: 'Nullable Schema',
        to: '/examples/nullable'
    }
]

const breadcrumbLinks = computed(() => {
    const links = [{ label: 'Home', to: '/' }]

    if (route.path !== '/') {
        const currentNav = navItems.find(item => item.to === route.path)
        if (currentNav) {
            links.push({ label: currentNav.label, to: currentNav.to })
        }
    }

    return links
})


const activeTab = computed({
    get: () => navItems.findIndex(item => item.to === route.path).toString(),
    set: (value) => router.push(navItems[+value].to)
})
</script>