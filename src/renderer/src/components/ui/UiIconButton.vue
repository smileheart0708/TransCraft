<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type UiIconButtonSize = 'xs' | 'sm' | 'md'
type NativeButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    size?: UiIconButtonSize
    type?: NativeButtonType
  }>(),
  {
    size: 'sm',
    type: 'button'
  }
)

const attrs = useAttrs()

const sizeClasses: Record<UiIconButtonSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-8 w-8'
}

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center rounded-lg bg-transparent text-text-muted transition-colors hover:text-text disabled:cursor-default disabled:opacity-50',
  sizeClasses[props.size]
])
</script>

<template>
  <button :type="type" :class="buttonClasses" v-bind="attrs">
    <slot />
  </button>
</template>
