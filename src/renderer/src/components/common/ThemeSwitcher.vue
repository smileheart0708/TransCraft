<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Sun, Moon, MonitorCog } from 'lucide-vue-next'
import UiDropdown from '@renderer/components/ui/UiDropdown.vue'
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import { useTheme, type ThemePreference } from '@renderer/composables/useTheme'

const LONG_PRESS_DURATION = 450

const themeItems: Array<{ value: ThemePreference; label: string; hint: string }> = [
  { value: 'system', label: 'System', hint: 'Follow system appearance' },
  { value: 'light', label: 'Light', hint: 'Always use light theme' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark theme' }
]

const themeLabelMap: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark'
}

const { themePreference, setThemePreference, cycleThemePreference } = useTheme()

const isDropdownOpen = ref(false)
const longPressTriggered = ref(false)
const longPressTimer = ref<number | null>(null)

const currentThemeLabel = computed(() => themeLabelMap[themePreference.value])

const themeIconMap = {
  system: MonitorCog,
  light: Sun,
  dark: Moon
} as const

const currentThemeIcon = computed(() => themeIconMap[themePreference.value])

function isThemePreference(value: string): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function setDropdownOpen(nextOpen: boolean): void {
  isDropdownOpen.value = nextOpen
}

function clearLongPressTimer(): void {
  if (longPressTimer.value === null) return
  window.clearTimeout(longPressTimer.value)
  longPressTimer.value = null
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return

  longPressTriggered.value = false
  clearLongPressTimer()
  longPressTimer.value = window.setTimeout(() => {
    longPressTriggered.value = true
    isDropdownOpen.value = true
  }, LONG_PRESS_DURATION)
}

function handlePointerRelease(): void {
  clearLongPressTimer()
}

function handleButtonClick(): void {
  if (longPressTriggered.value) {
    longPressTriggered.value = false
    return
  }

  if (isDropdownOpen.value) {
    isDropdownOpen.value = false
    return
  }

  cycleThemePreference()
}

function handleThemeSelect(value: string): void {
  if (!isThemePreference(value)) return
  setThemePreference(value)
}

function handleButtonKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      isDropdownOpen.value = true
      break
    case 'Escape':
      if (!isDropdownOpen.value) return
      event.preventDefault()
      isDropdownOpen.value = false
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      cycleThemePreference()
      break
    default:
      break
  }
}

onBeforeUnmount(() => {
  clearLongPressTimer()
})
</script>

<template>
  <UiDropdown
    :items="themeItems"
    :model-value="themePreference"
    :open="isDropdownOpen"
    placement="bottom-end"
    @update:model-value="handleThemeSelect"
    @update:open="setDropdownOpen"
  >
    <template #trigger="{ open }">
      <UiIconButton
        size="md"
        :aria-label="`Theme mode ${currentThemeLabel}. Click to cycle, long press for quick selection.`"
        :aria-pressed="themePreference !== 'system'"
        aria-haspopup="menu"
        :aria-expanded="open"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerRelease"
        @pointerleave="handlePointerRelease"
        @pointercancel="handlePointerRelease"
        @click="handleButtonClick"
        @keydown="handleButtonKeydown"
      >
        <component :is="currentThemeIcon" :size="18" :stroke-width="2" aria-hidden="true" />
      </UiIconButton>
    </template>
  </UiDropdown>
</template>
