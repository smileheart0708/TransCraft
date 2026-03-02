<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseDropdown from '@renderer/components/common/BaseDropdown.vue'
import { useTheme, type ThemePreference } from '@renderer/composables/useTheme'

const LONG_PRESS_DURATION = 450

const themeItems: Array<{ value: ThemePreference; label: string; hint: string }> = [
  { value: 'auto', label: 'Auto', hint: 'Follow system appearance' },
  { value: 'light', label: 'Light', hint: 'Always use light theme' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark theme' }
]

const themeLabelMap: Record<ThemePreference, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark'
}

const { themePreference, resolvedTheme, setThemePreference, cycleThemePreference } = useTheme()

const isDropdownOpen = ref(false)
const longPressTriggered = ref(false)
const longPressTimer = ref<number | null>(null)

const currentThemeLabel = computed(() => themeLabelMap[themePreference.value])

function isThemePreference(value: string): value is ThemePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
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
  <BaseDropdown
    :items="themeItems"
    :model-value="themePreference"
    :open="isDropdownOpen"
    placement="bottom-end"
    @update:model-value="handleThemeSelect"
    @update:open="setDropdownOpen"
  >
    <template #trigger="{ open }">
      <button
        type="button"
        class="theme-switcher"
        :class="{ 'is-open': open }"
        :aria-label="`Theme mode ${currentThemeLabel}. Click to cycle, long press for quick selection.`"
        :aria-pressed="themePreference !== 'auto'"
        aria-haspopup="menu"
        :aria-expanded="open"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerRelease"
        @pointerleave="handlePointerRelease"
        @pointercancel="handlePointerRelease"
        @click="handleButtonClick"
        @keydown="handleButtonKeydown"
      >
        <span class="theme-switcher__dot" :class="`is-${resolvedTheme}`" aria-hidden="true"></span>
        <span class="theme-switcher__label">{{ currentThemeLabel }}</span>
        <span class="theme-switcher__chevron" aria-hidden="true">▾</span>
      </button>
    </template>
  </BaseDropdown>
</template>

<style scoped>
.theme-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgb(var(--ui-border));
  background: rgb(var(--ui-surface));
  color: rgb(var(--ui-text));
  height: 30px;
  padding: 0 12px 0 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.theme-switcher:hover {
  border-color: rgb(var(--ui-brand));
}

.theme-switcher.is-open {
  border-color: rgb(var(--ui-brand));
  color: rgb(var(--ui-brand-emphasis));
}

.theme-switcher__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid rgb(var(--ui-border));
}

.theme-switcher__dot.is-light {
  background: rgb(var(--neutral-50));
}

.theme-switcher__dot.is-dark {
  background: rgb(var(--neutral-900));
}

.theme-switcher__label {
  letter-spacing: 0.01em;
}

.theme-switcher__chevron {
  font-size: 10px;
  color: rgb(var(--ui-text-muted));
}
</style>
