<script setup lang="ts">
import { computed } from 'vue'

type UiPanelElement = 'div' | 'section' | 'aside' | 'header' | 'footer'
type UiPanelTone = 'surface' | 'muted' | 'dashed'
type UiPanelPadding = 'none' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    as?: UiPanelElement
    tone?: UiPanelTone
    padding?: UiPanelPadding
    fullHeight?: boolean
  }>(),
  {
    as: 'div',
    tone: 'surface',
    padding: 'none',
    fullHeight: false
  }
)

const toneClasses: Record<UiPanelTone, string> = {
  surface: 'panel',
  muted: 'min-w-0 rounded-xl border border-border bg-surface-muted',
  dashed:
    'min-w-0 rounded-[14px] border border-dashed border-border bg-[linear-gradient(135deg,rgb(var(--ui-surface-muted)/0.72)_0%,rgb(var(--ui-surface)/0.82)_55%,rgb(var(--ui-surface))_100%)]'
}

const paddingClasses: Record<UiPanelPadding, string> = {
  none: '',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-[30px]'
}

const panelClasses = computed(() => [
  toneClasses[props.tone],
  paddingClasses[props.padding],
  props.fullHeight ? 'h-full min-h-0' : ''
])
</script>

<template>
  <component :is="as" :class="panelClasses">
    <slot />
  </component>
</template>
