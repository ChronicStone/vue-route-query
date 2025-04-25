<template>
    <div class="space-y-8">
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Nested Objects Example</h2>
            </template>

            <div class="space-y-6">
                <UCard>
                    <template #header>
                        <h3 class="font-medium">User Profile</h3>
                    </template>

                    <div class="space-y-4">
                        <UFormField label="First Name">
                            <UInput v-model="userProfile.personal.firstName" />
                        </UFormField>

                        <UFormField label="Last Name">
                            <UInput v-model="userProfile.personal.lastName" />
                        </UFormField>

                        <UFormField label="Email">
                            <UInput v-model="userProfile.contact.email" type="email" />
                        </UFormField>

                        <UFormField label="Phone">
                            <UInput v-model="userProfile.contact.phone" />
                        </UFormField>
                    </div>
                </UCard>

                <UCard>
                    <template #header>
                        <h3 class="font-medium">Preferences</h3>
                    </template>

                    <div class="space-y-4">
                        <UFormField label="Theme">
                            <USelectMenu v-model="userProfile.preferences.theme" :options="themeOptions"
                                value-attribute="value" option-attribute="label" />
                        </UFormField>

                        <UFormField label="Language">
                            <USelectMenu v-model="userProfile.preferences.language" :options="languageOptions"
                                value-attribute="value" option-attribute="label" />
                        </UFormField>

                        <UFormField label="Notifications">
                            <div class="space-y-2">
                                <UCheckbox v-model="userProfile.preferences.notifications.email"
                                    label="Email Notifications" />
                                <UCheckbox v-model="userProfile.preferences.notifications.push"
                                    label="Push Notifications" />
                                <UCheckbox v-model="userProfile.preferences.notifications.sms"
                                    label="SMS Notifications" />
                            </div>
                        </UFormField>
                    </div>
                </UCard>

                <USeparator label="Current State" />

                <pre
                    class="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">{{ JSON.stringify(userProfile, null, 2) }}</pre>

                <USeparator />

                <div class="flex gap-4">
                    <UButton @click="resetToDefaults" variant="soft">
                        Reset to Defaults
                    </UButton>
                    <UButton @click="setExampleProfile" color="primary">
                        Set Example Profile
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

const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' }
]

const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' }
]

const userProfile = useRouteQuery({
    key: 'user',
    schema: {
        personal: z.object({
            firstName: z.string(),
            lastName: z.string()
        }),
        contact: z.object({
            email: z.string(),
            phone: z.string()
        }),
        preferences: z.record(z.string(), z.any())
        // z.object({
        //     theme: z.enum(['light', 'dark', 'system']),
        //     language: z.string(),
        //     notifications: z.object({
        //         email: z.boolean(),
        //         push: z.boolean(),
        //         sms: z.boolean()
        //     })
        // })
    },
    default: {
        personal: {
            firstName: '',
            lastName: ''
        },
        contact: {
            email: '',
            phone: ''
        },
        preferences: {
            theme: 'system',
            language: 'en',
            notifications: {
                email: true,
                push: false,
                sms: false
            }
        }
    }
})

const resetToDefaults = () => {
    userProfile.value = {
        personal: {
            firstName: '',
            lastName: ''
        },
        contact: {
            email: '',
            phone: ''
        },
        preferences: {
            theme: 'system',
            language: 'en',
            notifications: {
                email: true,
                push: false,
                sms: false
            }
        }
    }
}

const setExampleProfile = () => {
    userProfile.value = {
        personal: {
            firstName: 'John',
            lastName: 'Doe'
        },
        contact: {
            email: 'john.doe@example.com',
            phone: '+1-555-123-4567'
        },
        preferences: {
            theme: 'dark',
            language: 'fr',
            notifications: {
                email: true,
                push: true,
                sms: false
            }
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