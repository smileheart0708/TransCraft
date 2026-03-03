<script setup lang="ts">
import { computed } from 'vue'
import { FolderPlus, FilePlus2 } from 'lucide-vue-next'
import WorkspaceTreeNode from './WorkspaceTreeNode.vue'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import type { WorkspaceEntryKind } from '../types/workspace'

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
  <aside class="workspace-tree">
    <header class="workspace-tree__header">
      <p class="workspace-tree__title">文件资源管理器</p>
      <div class="workspace-tree__actions">
        <button
          type="button"
          title="根目录新建文件"
          :disabled="!workspaceStore.hasWorkspace"
          @click="createAtRoot('file')"
        >
          <FilePlus2 :size="13" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="根目录新建文件夹"
          :disabled="!workspaceStore.hasWorkspace"
          @click="createAtRoot('directory')"
        >
          <FolderPlus :size="13" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="workspace-tree__body">
      <p v-if="!workspaceStore.hasWorkspace" class="workspace-tree__hint">请先打开工作区目录</p>
      <p v-else-if="isRootLoading" class="workspace-tree__hint">加载中...</p>
      <p v-else-if="rootNodes.length === 0" class="workspace-tree__hint">目录为空</p>
      <ul v-else class="workspace-tree__list">
        <WorkspaceTreeNode
          v-for="node in rootNodes"
          :key="node.relativePath"
          :node="node"
          :depth="0"
        />
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.workspace-tree {
  min-width: 0;
  height: 100%;
  min-height: 0;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 12px;
  background: rgb(var(--ui-surface));
  display: grid;
  grid-template-rows: auto 1fr;
}

.workspace-tree__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgb(var(--ui-border));
  padding: 10px;
}

.workspace-tree__title {
  margin: 0;
  font-size: 12px;
  color: rgb(var(--ui-text-muted));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.workspace-tree__actions {
  display: inline-flex;
  gap: 6px;
}

.workspace-tree__actions button {
  border: 1px solid rgb(var(--ui-border));
  border-radius: 7px;
  background: rgb(var(--ui-surface-muted));
  color: rgb(var(--ui-text));
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.workspace-tree__actions button:hover:not(:disabled) {
  border-color: rgb(var(--ui-brand));
}

.workspace-tree__actions button:disabled {
  opacity: 0.45;
}

.workspace-tree__body {
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.workspace-tree__list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.workspace-tree__hint {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  color: rgb(var(--ui-text-muted));
}
</style>
