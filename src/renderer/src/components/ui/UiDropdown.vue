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

const placementClass = computed(() => (props.placement === 'bottom-start' ? 'left-0' : 'right-0'))

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
  <div ref="rootRef" class="relative inline-flex items-center" @keydown="handleKeydown">
    <slot name="trigger" :open="open" />

    <div
      v-if="open"
      ref="menuRef"
      class="menu-surface absolute top-[calc(100%+8px)] z-1200 flex min-w-53 flex-col gap-0.5 p-1.5"
      :class="placementClass"
      role="menu"
      tabindex="-1"
      aria-orientation="vertical"
    >
      <button
        v-for="(item, index) in items"
        :key="item.value"
        type="button"
        class="menu-item flex w-full flex-col items-start gap-0.5 rounded-[10px] px-2.5 py-2 text-left leading-[1.2]"
        :class="{
          'border-brand text-brand-emphasis': item.value === modelValue,
          'border-border bg-surface-muted': index === activeIndex && item.value !== modelValue
        }"
        role="menuitemradio"
        :aria-checked="item.value === modelValue"
        @mouseenter="activeIndex = index"
        @click="selectByIndex(index)"
      >
        <span class="text-[13px] font-semibold">{{ item.label }}</span>
        <span v-if="item.hint" class="text-[11px] text-text-muted">{{ item.hint }}</span>
      </button>
    </div>
  </div>
</template>
