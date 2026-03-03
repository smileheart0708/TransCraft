<script setup lang="ts">
import UiDropdown from '@renderer/components/ui/UiDropdown.vue'

export type DropdownItem = {
  value: string
  label: string
  hint?: string
}

withDefaults(
  defineProps<{
    items: DropdownItem[]
    modelValue: string
    open: boolean
    placement?: 'bottom-start' | 'bottom-end'
  }>(),
  {
    placement: 'bottom-end'
  }
)

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'update:open', value: boolean): void
  (event: 'select', value: string): void
}>()
</script>

<template>
  <UiDropdown
    :items="items"
    :model-value="modelValue"
    :open="open"
    :placement="placement"
    @update:model-value="$emit('update:modelValue', $event)"
    @update:open="$emit('update:open', $event)"
    @select="$emit('select', $event)"
  >
    <template #trigger="slotProps">
      <slot name="trigger" v-bind="slotProps" />
    </template>
  </UiDropdown>
</template>
