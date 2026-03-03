<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import UiButton from '@renderer/components/ui/UiButton.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import type { WorkspaceTab } from '../../types/workspace'

const workspaceStore = useWorkspaceStore()

const openTabs = computed(() => workspaceStore.openTabs)
const pendingClosePath = ref<string | null>(null)
const isDialogOpen = ref(false)
const isSaving = ref(false)
const draggingPath = ref<string | null>(null)
const dropIndicator = ref<{ path: string; position: 'before' | 'after' } | null>(null)

const pendingCloseTab = computed(() => {
  if (!pendingClosePath.value) return null
  return openTabs.value.find((tab) => tab.relativePath === pendingClosePath.value) ?? null
})

function resolveDropPosition(event: DragEvent, targetElement: HTMLElement): 'before' | 'after' {
  const targetRect = targetElement.getBoundingClientRect()
  const offsetX = event.clientX - targetRect.left
  return offsetX > targetRect.width / 2 ? 'after' : 'before'
}

function handleTabDragStart(event: DragEvent, tab: WorkspaceTab): void {
  draggingPath.value = tab.relativePath
  dropIndicator.value = null

  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.setData('text/plain', tab.relativePath)
}

function handleTabDragOver(event: DragEvent, tab: WorkspaceTab): void {
  if (!draggingPath.value || draggingPath.value === tab.relativePath) return

  event.preventDefault()

  const targetElement = event.currentTarget
  if (!(targetElement instanceof HTMLElement)) return

  dropIndicator.value = {
    path: tab.relativePath,
    position: resolveDropPosition(event, targetElement)
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleTabDrop(event: DragEvent, tab: WorkspaceTab): void {
  if (!draggingPath.value || draggingPath.value === tab.relativePath) {
    dropIndicator.value = null
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const targetElement = event.currentTarget
  if (!(targetElement instanceof HTMLElement)) return

  const position = resolveDropPosition(event, targetElement)
  workspaceStore.moveTab(draggingPath.value, tab.relativePath, position === 'after')
  dropIndicator.value = null
}

function handleTabDragEnd(): void {
  draggingPath.value = null
  dropIndicator.value = null
}

function handleStripDragOver(event: DragEvent): void {
  if (!draggingPath.value) return
  event.preventDefault()

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleStripDrop(event: DragEvent): void {
  if (!draggingPath.value) return

  event.preventDefault()

  const lastTab = openTabs.value.at(-1)
  if (!lastTab || lastTab.relativePath === draggingPath.value) {
    dropIndicator.value = null
    return
  }

  workspaceStore.moveTab(draggingPath.value, lastTab.relativePath, true)
  dropIndicator.value = null
}

function requestCloseTab(tab: WorkspaceTab): void {
  if (!tab.isDirty) {
    workspaceStore.closeTab(tab.relativePath)
    return
  }

  pendingClosePath.value = tab.relativePath
  isDialogOpen.value = true
}

function closeDialog(): void {
  if (isSaving.value) return
  isDialogOpen.value = false
  pendingClosePath.value = null
}

async function handleSaveAndClose(): Promise<void> {
  const relativePath = pendingClosePath.value

  if (!relativePath || isSaving.value) return

  isSaving.value = true
  const didSave = await workspaceStore.saveTab(relativePath)
  isSaving.value = false

  if (!didSave) return

  workspaceStore.closeTab(relativePath)
  closeDialog()
}

function handleDiscardAndClose(): void {
  const relativePath = pendingClosePath.value

  if (!relativePath || isSaving.value) return

  workspaceStore.closeTab(relativePath)
  closeDialog()
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (!isDialogOpen.value || event.key !== 'Escape') return
  event.preventDefault()
  closeDialog()
}

watch(isDialogOpen, (nextOpen) => {
  if (nextOpen) {
    window.addEventListener('keydown', onWindowKeydown)
    return
  }

  window.removeEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <section class="workspace-tabs min-w-0 border-b border-border bg-surface">
    <div
      class="flex min-w-0 overflow-x-auto [scrollbar-width:thin]"
      @dragover="handleStripDragOver"
      @drop="handleStripDrop"
    >
      <div
        v-for="tab in openTabs"
        :key="tab.relativePath"
        class="workspace-tab group"
        :class="{
          'is-active': workspaceStore.activeTabPath === tab.relativePath,
          'is-dragging': draggingPath === tab.relativePath,
          'is-drop-before':
            dropIndicator?.path === tab.relativePath && dropIndicator.position === 'before',
          'is-drop-after':
            dropIndicator?.path === tab.relativePath && dropIndicator.position === 'after'
        }"
        :title="tab.relativePath"
        role="button"
        tabindex="0"
        draggable="true"
        @click="workspaceStore.setActiveTab(tab.relativePath)"
        @keydown.enter.prevent="workspaceStore.setActiveTab(tab.relativePath)"
        @keydown.space.prevent="workspaceStore.setActiveTab(tab.relativePath)"
        @dragstart="handleTabDragStart($event, tab)"
        @dragover="handleTabDragOver($event, tab)"
        @drop="handleTabDrop($event, tab)"
        @dragend="handleTabDragEnd"
      >
        <span class="ellipsis text-xs">{{ tab.title }}</span>

        <button
          type="button"
          draggable="false"
          class="tab-close-hit"
          :aria-label="`关闭 ${tab.title}`"
          @click.stop="requestCloseTab(tab)"
        >
          <span class="tab-dirty-dot" :class="{ 'is-visible': tab.isDirty }" aria-hidden="true"
            >●</span
          >
          <X :size="12" aria-hidden="true" class="tab-close-icon" />
        </button>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="isDialogOpen"
      class="fixed inset-0 z-[1200] grid place-items-center bg-[rgb(0_0_0/0.5)] p-4"
      @click.self="closeDialog"
    >
      <section class="w-full max-w-sm rounded-xl border border-border bg-surface p-4">
        <h3 class="m-0 text-sm font-semibold text-text">是否保存对文件的更改？</h3>

        <p class="mb-0 mt-2 text-xs text-text-muted">
          <span class="font-medium text-text">{{ pendingCloseTab?.title ?? '当前文件' }}</span>
          尚未保存，关闭前请确认。
        </p>

        <p
          class="ellipsis mb-0 mt-1 text-[11px] text-text-muted"
          :title="pendingCloseTab?.relativePath"
        >
          {{ pendingCloseTab?.relativePath }}
        </p>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <UiButton variant="ghost" size="sm" :disabled="isSaving" @click="closeDialog"
            >取消</UiButton
          >
          <UiButton variant="soft" size="sm" :disabled="isSaving" @click="handleDiscardAndClose">
            不保存
          </UiButton>
          <UiButton variant="soft" size="sm" :disabled="isSaving" @click="handleSaveAndClose">
            {{ isSaving ? '保存中...' : '保存并关闭' }}
          </UiButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.workspace-tabs {
  min-height: 34px;
}

.workspace-tab {
  display: inline-flex;
  min-width: 0;
  max-width: 260px;
  align-items: center;
  gap: 6px;
  border-left: 1px solid rgb(var(--ui-border));
  border-top: 2px solid transparent;
  background: rgb(var(--ui-surface-muted) / 0.42);
  padding: 6px 8px 5px;
  color: rgb(var(--ui-text-muted));
  transition:
    background-color 120ms ease,
    color 120ms ease,
    border-top-color 120ms ease;
  user-select: none;
}

.workspace-tab:last-child {
  border-right: 1px solid rgb(var(--ui-border));
}

.workspace-tab:hover {
  background: rgb(var(--ui-surface-muted) / 0.74);
  color: rgb(var(--ui-text));
}

.workspace-tab.is-active {
  border-top-color: rgb(var(--ui-brand));
  background: rgb(var(--ui-surface));
  color: rgb(var(--ui-text));
}

.workspace-tab.is-dragging {
  opacity: 0.6;
}

.workspace-tab.is-drop-before {
  box-shadow: inset 2px 0 0 rgb(var(--ui-brand));
}

.workspace-tab.is-drop-after {
  box-shadow: inset -2px 0 0 rgb(var(--ui-brand));
}

.tab-close-hit {
  position: relative;
  display: inline-flex;
  height: 14px;
  width: 14px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  padding: 0;
  color: rgb(var(--ui-text-muted));
}

.tab-close-hit:hover {
  background: rgb(var(--ui-surface-muted));
  color: rgb(var(--ui-text));
}

.tab-dirty-dot {
  font-size: 10px;
  line-height: 1;
  opacity: 0;
  transition: opacity 120ms ease;
}

.tab-dirty-dot.is-visible {
  opacity: 1;
}

.tab-close-icon {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.tab-close-hit:hover .tab-close-icon {
  opacity: 1;
}

.tab-close-hit:hover .tab-dirty-dot {
  opacity: 0;
}
</style>
