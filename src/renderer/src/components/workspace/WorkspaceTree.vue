<script setup lang="ts">
import { computed } from 'vue'
import { FolderPlus, FilePlus2 } from 'lucide-vue-next'
import UiPanel from '@renderer/components/ui/UiPanel.vue'
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import WorkspaceTreeNode from './WorkspaceTreeNode.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import type { WorkspaceEntryKind } from '../../types/workspace'

const workspaceStore = useWorkspaceStore()

const isRootLoading = computed(() => workspaceStore.isParentLoading(null))
const rootNodes = computed(() => workspaceStore.rootNodes)

function createAtRoot(kind: WorkspaceEntryKind): void {
  const defaultName = kind === 'file' ? 'untitled.txt' : 'new-folder'
  const input = window.prompt(kind === 'file' ? '请输入文件路径' : '请输入文件夹路径', defaultName)
  if (!input) return

  void workspaceStore.createEntryByRelativePath(input, kind)
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
      <p v-if="!workspaceStore.hasWorkspace" class="hint-text p-2">请先打开工作区目录</p>
      <p v-else-if="isRootLoading" class="hint-text p-2">加载中...</p>
      <p v-else-if="rootNodes.length === 0" class="hint-text p-2">目录为空</p>
      <ul v-else class="m-0 grid gap-0.5 p-0">
        <WorkspaceTreeNode
          v-for="node in rootNodes"
          :key="node.relativePath"
          :node="node"
          :depth="0"
        />
      </ul>
    </div>
  </UiPanel>
</template>
