<template>
    <div class="min-h-screen bg-gray-50">
        <UContainer class="py-4 sm:py-8">
            <UCard class="mb-4 sm:mb-8">
                <template #header>
                    <h1 class="text-xl sm:text-2xl font-bold">Vue Route Query Playground</h1>
                </template>
                <!-- Mobile breadcrumb is hidden on small screens -->
                <div class="hidden sm:block">
                    <UBreadcrumb :links="breadcrumbLinks" class="mb-4" />
                </div>
                <!-- Desktop tabs view -->
                <div class="hidden sm:block">
                    <UTabs :items="navItems" v-model="activeTab" />
                </div>
                <!-- Mobile dropdown/select navigation -->
                <div class="sm:hidden mb-4">
                    <USelect v-model="mobileActiveTab" value-key="value" :items="navItems.map((item, index) => ({
                        label: item.label,
                        value: index.toString()
                    }))" placeholder="Navigate to..." class="w-full" />
                </div>
            </UCard>

            <slot />
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
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

// For desktop tab view
const activeTab = computed({
    get: () => navItems.findIndex(item => item.to === route.path).toString(),
    set: (value) => router.push(navItems[+value].to)
})

// For mobile dropdown/select
const mobileActiveTab = computed({
    get: () => navItems.findIndex(item => item.to === route.path).toString(),
    set: (value) => router.push(navItems[+value].to)
})

// Update mobile view when route changes
watch(() => route.path, () => {
    // This keeps the mobile dropdown in sync with the URL
    // (though the computed property should handle this too)
}, { immediate: true })
</script>