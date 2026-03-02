<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type DropdownItem = {
  value: string
  label: string
  hint?: string
}

const props = withDefaults(
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

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'update:open', value: boolean): void
  (event: 'select', value: string): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

const selectedIndex = computed(() => {
  const index = props.items.findIndex((item) => item.value === props.modelValue)
  return index >= 0 ? index : 0
})

const placementClass = computed(() =>
  props.placement === 'bottom-start' ? 'base-dropdown--bottom-start' : 'base-dropdown--bottom-end'
)

function selectByIndex(index: number): void {
  const targetItem = props.items[index]
  if (!targetItem) return

  emit('update:modelValue', targetItem.value)
  emit('select', targetItem.value)
  emit('update:open', false)
}

function moveActiveIndex(step: number): void {
  const itemCount = props.items.length
  if (itemCount === 0) return

  activeIndex.value = (activeIndex.value + step + itemCount) % itemCount
}

function handlePointerDownOutside(event: PointerEvent): void {
  if (!props.open) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (rootRef.value?.contains(target)) return

  emit('update:open', false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.open) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActiveIndex(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActiveIndex(-1)
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = 0
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = Math.max(0, props.items.length - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      selectByIndex(activeIndex.value)
      break
    case 'Escape':
      event.preventDefault()
      emit('update:open', false)
      break
    default:
      break
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    activeIndex.value = selectedIndex.value
    void nextTick(() => menuRef.value?.focus())
  }
)

watch(
  () => props.modelValue,
  () => {
    if (!props.open) return
    activeIndex.value = selectedIndex.value
  }
)

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDownOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDownOutside)
})
</script>

<template>
  <div ref="rootRef" class="base-dropdown" :class="placementClass" @keydown="handleKeydown">
    <slot name="trigger" :open="open" />

    <div
      v-if="open"
      ref="menuRef"
      class="base-dropdown__menu"
      role="menu"
      tabindex="-1"
      aria-orientation="vertical"
    >
      <button
        v-for="(item, index) in items"
        :key="item.value"
        type="button"
        class="base-dropdown__item"
        :class="{
          'is-selected': item.value === modelValue,
          'is-active': index === activeIndex
        }"
        role="menuitemradio"
        :aria-checked="item.value === modelValue"
        @mouseenter="activeIndex = index"
        @click="selectByIndex(index)"
      >
        <span class="base-dropdown__item-label">{{ item.label }}</span>
        <span v-if="item.hint" class="base-dropdown__item-hint">{{ item.hint }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.base-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.base-dropdown__menu {
  position: absolute;
  top: calc(100% + 8px);
  z-index: 1200;
  display: flex;
  min-width: 212px;
  flex-direction: column;
  gap: 2px;
  border-radius: 12px;
  border: 1px solid rgb(var(--ui-border));
  background: rgb(var(--ui-surface));
  padding: 6px;
}

.base-dropdown--bottom-start .base-dropdown__menu {
  left: 0;
}

.base-dropdown--bottom-end .base-dropdown__menu {
  right: 0;
}

.base-dropdown__item {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: rgb(var(--ui-text));
  padding: 8px 10px;
  text-align: left;
  line-height: 1.2;
}

.base-dropdown__item:hover,
.base-dropdown__item.is-active {
  border-color: rgb(var(--ui-border));
  background: rgb(var(--ui-surface-muted));
}

.base-dropdown__item.is-selected {
  border-color: rgb(var(--ui-brand));
  color: rgb(var(--ui-brand-emphasis));
}

.base-dropdown__item-label {
  font-size: 13px;
  font-weight: 600;
}

.base-dropdown__item-hint {
  font-size: 11px;
  color: rgb(var(--ui-text-muted));
}
</style>
