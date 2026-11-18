<script setup lang="ts">
import {
  booleanCodec,
  dynamicQueryState,
  numberCodec,
  stringCodec,
  useQueryStates,
} from '@chronicstone/vue-route-query'
import type { AnyQueryCodec } from '@chronicstone/vue-route-query'

interface FilterField {
  key: string
  codec: AnyQueryCodec
  operators: ('eq' | 'gte')[]
}

interface Rule {
  field: string
  operator: 'eq' | 'gte'
  value: unknown
}

// In an app these come from data: a table's columns, a saved view, a config API.
const fields: FilterField[] = [
  { key: 'department', codec: stringCodec(), operators: ['eq'] },
  { key: 'remote', codec: booleanCodec(), operators: ['eq'] },
  { key: 'salary', codec: numberCodec({ int: true, min: 0 }), operators: ['gte'] },
]

const urlKey = (field: string, operator: string) =>
  operator === 'eq' ? field : `${field}~${operator}`

const state = useQueryStates({
  prefix: 'f',
  schema: {
    rules: dynamicQueryState({
      urlPrefix: 'fields',
      definitions: () => fields,
      resolve: (field) =>
        field.operators.map((operator) => ({
          urlKey: urlKey(field.key, operator),
          codec: field.codec,
        })),
      parse: (entries): Rule[] =>
        [...entries].map(([key, value]) => {
          const [field = key, operator = 'eq'] = key.split('~')
          return { field, operator: operator as Rule['operator'], value }
        }),
      serialize: (rules) =>
        new Map(rules.map((rule) => [urlKey(rule.field, rule.operator), rule.value])),
      default: [] as Rule[],
    }),
  },
})

function ruleValue(field: string) {
  return state.value.rules.find((rule) => rule.field === field)?.value
}

function setRule(field: string, operator: Rule['operator'], value: unknown) {
  const rules = state.value.rules.filter((rule) => rule.field !== field)
  state.value = { rules: value === undefined ? rules : [...rules, { field, operator, value }] }
}

const value = computed(() => JSON.stringify(state.value.rules, null, 2))
</script>

<template>
  <DemoShell
    :keys="['f']"
    label="Three runtime-defined fields, four possible URL keys, one typed array."
  >
    <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
      <div class="flex flex-col gap-3">
        <div class="demo-row">
          <span class="demo-label">department</span>
          <UFieldGroup size="sm">
            <UButton
              v-for="option in ['Engineering', 'Design', 'Sales']"
              :key="option"
              :color="ruleValue('department') === option ? 'primary' : 'neutral'"
              :variant="ruleValue('department') === option ? 'soft' : 'outline'"
              @click="
                setRule('department', 'eq', ruleValue('department') === option ? undefined : option)
              "
            >
              {{ option }}
            </UButton>
          </UFieldGroup>
        </div>
        <div class="demo-row">
          <span class="demo-label">remote</span>
          <USwitch
            size="sm"
            :model-value="ruleValue('remote') === true"
            label="Remote only"
            @update:model-value="setRule('remote', 'eq', $event ? true : undefined)"
          />
        </div>
        <div class="demo-row">
          <span class="demo-label">salary ≥</span>
          <UFieldGroup size="sm">
            <UButton
              v-for="option in [40000, 60000, 80000]"
              :key="option"
              :color="ruleValue('salary') === option ? 'primary' : 'neutral'"
              :variant="ruleValue('salary') === option ? 'soft' : 'outline'"
              @click="setRule('salary', 'gte', ruleValue('salary') === option ? undefined : option)"
            >
              {{ option / 1000 }}k
            </UButton>
          </UFieldGroup>
        </div>
      </div>
      <pre class="demo-json">{{ value }}</pre>
    </div>
  </DemoShell>
</template>
