<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus, Save, X } from 'lucide-vue-next'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import { getParentPath } from '../types/workspace'
import type { WorkspaceEntryKind } from '../types/workspace'

const workspaceStore = useWorkspaceStore()

const rootRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

const hasOpenTabs = computed(() => workspaceStore.openTabs.length > 0)

function getSuggestedBasePath(): string {
  const selectedPath = workspaceStore.selectedPath
  if (!selectedPath) {
    return ''
  }

  const selectedNode = workspaceStore.findNode(selectedPath)
  if (!selectedNode) {
    return getParentPath(selectedPath) ?? ''
  }

  if (selectedNode.kind === 'directory') {
    return selectedNode.relativePath
  }

  return getParentPath(selectedNode.relativePath) ?? ''
}

function openCreatePrompt(kind: WorkspaceEntryKind): void {
  const basePath = getSuggestedBasePath()
  const defaultName = kind === 'file' ? 'untitled.txt' : 'new-folder'
  const defaultPath = basePath ? `${basePath}/${defaultName}` : defaultName

  const nextPath = window.prompt(
    kind === 'file' ? '请输入新文件相对路径' : '请输入新文件夹相对路径',
    defaultPath
  )

  if (!nextPath) return

  void workspaceStore.createEntryByRelativePath(nextPath, kind)
}

function handleCommand(command: 'open-workspace' | 'new-file' | 'new-folder'): void {
  menuOpen.value = false

  switch (command) {
    case 'open-workspace':
      void workspaceStore.pickWorkspace()
      break
    case 'new-file':
      openCreatePrompt('file')
      break
    case 'new-folder':
      openCreatePrompt('directory')
      break
    default:
      break
  }
}

function closeMenuOnOutside(event: PointerEvent): void {
  if (!menuOpen.value) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (rootRef.value?.contains(target)) return

  menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeMenuOnOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeMenuOnOutside)
})
</script>

<template>
  <section ref="rootRef" class="workspace-tabs">
    <div class="workspace-tabs__left">
      <button
        type="button"
        class="workspace-tabs__plus"
        :class="{ 'is-open': menuOpen }"
        aria-label="Tab actions"
        @click="menuOpen = !menuOpen"
      >
        <Plus :size="14" aria-hidden="true" />
      </button>

      <div v-if="menuOpen" class="workspace-tabs__menu" role="menu">
        <button type="button" role="menuitem" @click="handleCommand('open-workspace')">
          打开工作区
        </button>
        <button
          type="button"
          role="menuitem"
          :disabled="!workspaceStore.hasWorkspace"
          @click="handleCommand('new-file')"
        >
          新建文件
        </button>
        <button
          type="button"
          role="menuitem"
          :disabled="!workspaceStore.hasWorkspace"
          @click="handleCommand('new-folder')"
        >
          新建文件夹
        </button>
      </div>

      <div class="workspace-tabs__scroll">
        <button
          v-for="tab in workspaceStore.openTabs"
          :key="tab.relativePath"
          type="button"
          class="workspace-tabs__item"
          :class="{ 'is-active': workspaceStore.activeTabPath === tab.relativePath }"
          :title="tab.relativePath"
          @click="workspaceStore.setActiveTab(tab.relativePath)"
        >
          <span class="workspace-tabs__dirty" :class="{ 'is-visible': tab.isDirty }">●</span>
          <span class="workspace-tabs__label">{{ tab.title }}</span>
          <span
            class="workspace-tabs__close"
            @click.stop="workspaceStore.closeTab(tab.relativePath)"
          >
            <X :size="12" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>

    <button
      type="button"
      class="workspace-tabs__save"
      :disabled="
        !workspaceStore.activeTab ||
        !workspaceStore.activeTab.isDirty ||
        workspaceStore.activeTab.isBinary
      "
      @click="workspaceStore.saveActiveTab"
    >
      <Save :size="14" aria-hidden="true" />
      保存
    </button>

    <p v-if="!hasOpenTabs" class="workspace-tabs__empty">尚未打开文件</p>
  </section>
</template>

<style scoped>
.workspace-tabs {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 12px;
  background: rgb(var(--ui-surface));
  padding: 7px;
}

.workspace-tabs__left {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-tabs__plus,
.workspace-tabs__save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 8px;
  background: rgb(var(--ui-surface-muted));
  color: rgb(var(--ui-text));
  padding: 6px 9px;
  font-size: 12px;
  font-weight: 600;
}

.workspace-tabs__plus.is-open,
.workspace-tabs__plus:hover,
.workspace-tabs__save:hover:not(:disabled) {
  border-color: rgb(var(--ui-brand));
}

.workspace-tabs__save:disabled {
  opacity: 0.5;
}

.workspace-tabs__menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 10;
  display: grid;
  gap: 4px;
  min-width: 160px;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 10px;
  background: rgb(var(--ui-surface));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.16);
  padding: 6px;
}

.workspace-tabs__menu button {
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: rgb(var(--ui-text));
  text-align: left;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 600;
}

.workspace-tabs__menu button:hover:not(:disabled) {
  border-color: rgb(var(--ui-border));
  background: rgb(var(--ui-surface-muted));
}

.workspace-tabs__menu button:disabled {
  opacity: 0.45;
}

.workspace-tabs__scroll {
  min-width: 0;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 1px;
}

.workspace-tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 8px;
  background: rgb(var(--ui-surface));
  color: rgb(var(--ui-text-muted));
  min-width: 0;
  max-width: 240px;
  padding: 6px 8px;
}

.workspace-tabs__item.is-active {
  border-color: rgb(var(--ui-brand));
  background: rgb(var(--ui-surface-muted));
  color: rgb(var(--ui-text));
}

.workspace-tabs__dirty {
  visibility: hidden;
  color: rgb(var(--ui-brand-emphasis));
  font-size: 10px;
  line-height: 1;
}

.workspace-tabs__dirty.is-visible {
  visibility: visible;
}

.workspace-tabs__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.workspace-tabs__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 1px;
}

.workspace-tabs__close:hover {
  background: rgb(var(--ui-surface));
}

.workspace-tabs__empty {
  position: absolute;
  left: 58px;
  margin: 0;
  font-size: 12px;
  color: rgb(var(--ui-text-muted));
  pointer-events: none;
}

@media (max-width: 760px) {
  .workspace-tabs {
    grid-template-columns: 1fr;
  }

  .workspace-tabs__save {
    justify-self: end;
  }
}
</style>
