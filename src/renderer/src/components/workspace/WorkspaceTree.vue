<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FolderPlus, FilePlus2 } from 'lucide-vue-next'
import UiPanel from '@renderer/components/ui/UiPanel.vue'
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import WorkspaceTreeNode from './WorkspaceTreeNode.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import type { WorkspaceEntryKind } from '../../types/workspace'

const workspaceStore = useWorkspaceStore()

const isRootLoading = computed(() => workspaceStore.isParentLoading(null))
const rootNodes = computed(() => workspaceStore.rootNodes)
const isImportingArchive = computed(() => workspaceStore.isImportingArchive)

const isImportRevealActive = ref(false)
let importRevealTimer: number | null = null

watch(
  () => workspaceStore.importRevealToken,
  (token) => {
    if (token <= 0) {
      return
    }

    isImportRevealActive.value = true

    if (importRevealTimer !== null) {
      window.clearTimeout(importRevealTimer)
    }

    importRevealTimer = window.setTimeout(() => {
      isImportRevealActive.value = false
      importRevealTimer = null
    }, 900)
  }
)

onBeforeUnmount(() => {
  if (importRevealTimer === null) {
    return
  }

  window.clearTimeout(importRevealTimer)
  importRevealTimer = null
})

function createAtRoot(kind: WorkspaceEntryKind): void {
  const defaultName = kind === 'file' ? 'untitled.txt' : 'new-folder'
  const input = window.prompt(kind === 'file' ? '请输入文件路径' : '请输入文件夹路径', defaultName)
  if (!input) return

  void workspaceStore.createEntryByRelativePath(input, kind)
}

function rootNodeAnimationStyle(index: number): Record<string, string> | undefined {
  if (!isImportRevealActive.value) {
    return undefined
  }

  return {
    '--import-reveal-delay': `${Math.min(index, 18) * 42}ms`
  }
}
</script>

<template>
  <UiPanel as="aside" full-height class="grid select-none grid-rows-[auto_minmax(0,1fr)]">
    <header class="panel-header">
      <p class="kicker text-xs tracking-[0.08em]">文件资源管理器</p>
      <div class="inline-flex gap-1.5">
        <UiIconButton
          variant="soft"
          size="sm"
          title="根目录新建文件"
          :disabled="!workspaceStore.hasWorkspace"
          @click="createAtRoot('file')"
        >
          <FilePlus2 :size="13" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton
          variant="soft"
          size="sm"
          title="根目录新建文件夹"
          :disabled="!workspaceStore.hasWorkspace"
          @click="createAtRoot('directory')"
        >
          <FolderPlus :size="13" aria-hidden="true" />
        </UiIconButton>
      </div>
    </header>

    <div class="min-h-0 overflow-auto p-2">
      <p v-if="isImportingArchive" class="hint-text px-2 pb-2 pt-1">正在导入压缩包...</p>
      <p v-if="!workspaceStore.hasWorkspace" class="hint-text p-2">请先打开工作区目录</p>
      <p v-else-if="isRootLoading" class="hint-text p-2">加载中...</p>
      <p v-else-if="rootNodes.length === 0" class="hint-text p-2">目录为空</p>
      <ul v-else class="m-0 grid gap-0.5 p-0">
        <WorkspaceTreeNode
          v-for="(node, index) in rootNodes"
          :key="`${node.relativePath}:${workspaceStore.importRevealToken}`"
          :node="node"
          :depth="0"
          :class="isImportRevealActive ? 'workspace-tree-node--import-reveal' : ''"
          :style="rootNodeAnimationStyle(index)"
        />
      </ul>
    </div>
  </UiPanel>
</template>

<style scoped>
.workspace-tree-node--import-reveal {
  opacity: 0;
  transform: translateY(5px);
  animation: workspace-tree-import-reveal 240ms cubic-bezier(0.2, 0.9, 0.24, 1) forwards;
  animation-delay: var(--import-reveal-delay, 0ms);
}

@keyframes workspace-tree-import-reveal {
  0% {
    opacity: 0;
    transform: translateY(5px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-tree-node--import-reveal {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
</style>
