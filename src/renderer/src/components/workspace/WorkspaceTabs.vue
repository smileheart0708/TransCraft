<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus, Save, X } from 'lucide-vue-next'
import UiButton from '@renderer/components/ui/UiButton.vue'
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { getParentPath } from '../../types/workspace'
import type { WorkspaceEntryKind } from '../../types/workspace'

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
  <section
    ref="rootRef"
    class="panel relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 py-1.75 max-[760px]:grid-cols-1"
  >
    <div class="relative flex min-w-0 items-center gap-2">
      <UiIconButton
        variant="soft"
        size="sm"
        :active="menuOpen"
        aria-label="Tab actions"
        @click="menuOpen = !menuOpen"
      >
        <Plus :size="14" aria-hidden="true" />
      </UiIconButton>

      <div
        v-if="menuOpen"
        class="menu-surface absolute left-0 top-[calc(100%+8px)] z-10 grid min-w-40 gap-1 p-1.5"
        role="menu"
      >
        <button
          type="button"
          class="menu-item w-full px-2 py-1.75 text-left text-xs font-semibold"
          role="menuitem"
          @click="handleCommand('open-workspace')"
        >
          打开工作区
        </button>
        <button
          type="button"
          class="menu-item w-full px-2 py-1.75 text-left text-xs font-semibold"
          role="menuitem"
          :disabled="!workspaceStore.hasWorkspace"
          @click="handleCommand('new-file')"
        >
          新建文件
        </button>
        <button
          type="button"
          class="menu-item w-full px-2 py-1.75 text-left text-xs font-semibold"
          role="menuitem"
          :disabled="!workspaceStore.hasWorkspace"
          @click="handleCommand('new-folder')"
        >
          新建文件夹
        </button>
      </div>

      <div class="flex min-w-0 gap-1.5 overflow-x-auto pb-px [scrollbar-width:thin]">
        <button
          v-for="tab in workspaceStore.openTabs"
          :key="tab.relativePath"
          type="button"
          class="inline-flex min-w-0 max-w-60 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-text-muted transition-colors hover:border-brand hover:bg-surface-muted hover:text-text"
          :class="{
            'border-brand bg-surface-muted text-text':
              workspaceStore.activeTabPath === tab.relativePath
          }"
          :title="tab.relativePath"
          @click="workspaceStore.setActiveTab(tab.relativePath)"
        >
          <span
            class="text-[10px] leading-none text-brand-emphasis"
            :class="tab.isDirty ? 'visible' : 'invisible'"
            >●</span
          >
          <span class="ellipsis text-xs">{{ tab.title }}</span>
          <span
            class="inline-flex items-center justify-center rounded-md p-px hover:bg-surface"
            @click.stop="workspaceStore.closeTab(tab.relativePath)"
          >
            <X :size="12" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>

    <UiButton
      variant="soft"
      size="sm"
      class="max-[760px]:justify-self-end"
      :disabled="
        !workspaceStore.activeTab ||
        !workspaceStore.activeTab.isDirty ||
        workspaceStore.activeTab.isBinary
      "
      @click="workspaceStore.saveActiveTab"
    >
      <Save :size="14" aria-hidden="true" />
      保存
    </UiButton>

    <p
      v-if="!hasOpenTabs"
      class="pointer-events-none absolute left-14.5 m-0 text-xs text-text-muted"
    >
      尚未打开文件
    </p>
  </section>
</template>
