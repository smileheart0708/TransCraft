<script setup lang="ts">
import UiButton from './UiButton.vue'

type UiIconButtonVariant = 'soft' | 'surface' | 'ghost'
type UiIconButtonSize = 'xs' | 'sm'
type NativeButtonType = 'button' | 'submit' | 'reset'

withDefaults(
  defineProps<{
    variant?: UiIconButtonVariant
    size?: UiIconButtonSize
    active?: boolean
    type?: NativeButtonType
  }>(),
  {
    variant: 'soft',
    size: 'sm',
    active: false,
    type: 'button'
  }
)
</script>

<template>
  <UiButton :variant="variant" :size="size" :active="active" :type="type" icon-only>
    <slot />
  </UiButton>
</template>
