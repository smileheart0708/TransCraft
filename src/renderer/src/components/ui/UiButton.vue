<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type UiButtonVariant = 'soft' | 'surface' | 'ghost' | 'danger-soft'
type UiButtonSize = 'xs' | 'sm' | 'md'
type NativeButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    size?: UiButtonSize
    active?: boolean
    iconOnly?: boolean
    type?: NativeButtonType
  }>(),
  {
    variant: 'soft',
    size: 'sm',
    active: false,
    iconOnly: false,
    type: 'button'
  }
)

const attrs = useAttrs()

const variantClasses: Record<UiButtonVariant, string> = {
  soft: 'border border-border bg-surface-muted text-text enabled:hover:border-brand',
  surface:
    'border border-border bg-surface text-text-muted enabled:hover:border-brand enabled:hover:bg-surface-muted enabled:hover:text-text',
  ghost:
    'border border-transparent bg-transparent text-text enabled:hover:border-border enabled:hover:bg-surface-muted',
  'danger-soft':
    'border border-[rgb(var(--brand-300))] bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:border-[rgb(var(--brand-700))] dark:bg-[rgb(var(--brand-900)/0.45)] dark:text-[rgb(var(--brand-200))]'
}

const baseSizeClasses: Record<UiButtonSize, string> = {
  xs: 'gap-1 px-2 py-1 text-xs',
  sm: 'gap-1.5 px-2.5 py-1.5 text-xs',
  md: 'gap-1.5 px-3 py-1.5 text-sm'
}

const iconSizeClasses: Record<UiButtonSize, string> = {
  xs: 'h-5 w-5 p-0',
  sm: 'h-6 w-6 p-0',
  md: 'h-7 w-7 p-0'
}

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-default disabled:opacity-50',
  variantClasses[props.variant],
  props.iconOnly ? iconSizeClasses[props.size] : baseSizeClasses[props.size],
  props.active ? 'border-brand text-brand-emphasis' : ''
])
</script>

<template>
  <button :type="type" :class="buttonClasses" v-bind="attrs">
    <slot />
  </button>
</template>
