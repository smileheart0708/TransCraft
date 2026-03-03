<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  Pencil,
  Trash2,
  FilePlus2
} from 'lucide-vue-next'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import type { WorkspaceEntryKind, WorkspaceNodeDTO } from '../types/workspace'

defineOptions({
  name: 'WorkspaceTreeNode'
})

const props = defineProps<{
  node: WorkspaceNodeDTO
  depth: number
}>()

const workspaceStore = useWorkspaceStore()

const isDirectory = computed(() => props.node.kind === 'directory')
const isExpanded = computed(() =>
  isDirectory.value ? workspaceStore.isExpanded(props.node.relativePath) : false
)
const children = computed(() => workspaceStore.getChildren(props.node.relativePath))
const isLoading = computed(() => workspaceStore.isParentLoading(props.node.relativePath))
const isSelected = computed(() => workspaceStore.selectedPath === props.node.relativePath)
const rowIndent = computed(() => ({
  '--node-depth': `${props.depth}`
}))

function handleNodeClick(): void {
  workspaceStore.setSelectedPath(props.node.relativePath)

  if (isDirectory.value) {
    void workspaceStore.toggleDirectory(props.node.relativePath)
    return
  }

  void workspaceStore.openFile(props.node.relativePath)
}

function createChild(kind: WorkspaceEntryKind): void {
  if (!isDirectory.value) return

  const defaultName = kind === 'file' ? 'untitled.txt' : 'new-folder'
  const pathSuggestion = `${props.node.relativePath}/${defaultName}`
  const input = window.prompt(
    kind === 'file' ? '请输入文件路径' : '请输入文件夹路径',
    pathSuggestion
  )
  if (!input) return

  void workspaceStore.createEntryByRelativePath(input, kind)
}

function renameNode(): void {
  const nextName = window.prompt('请输入新名称', props.node.name)
  if (!nextName || nextName === props.node.name) return

  void workspaceStore.renameEntry(props.node.relativePath, nextName)
}

function deleteNode(): void {
  const label = isDirectory.value ? '文件夹' : '文件'
  const confirmed = window.confirm(`确认删除${label} ${props.node.name} ?`)
  if (!confirmed) return

  void workspaceStore.deleteEntry(props.node.relativePath)
}

function revealNode(): void {
  void workspaceStore.revealInOs(props.node.relativePath)
}
</script>

<template>
  <li class="workspace-tree-node">
    <div
      class="workspace-tree-node__row"
      :class="{
        'is-directory': isDirectory,
        'is-selected': isSelected
      }"
      :style="rowIndent"
      :title="node.relativePath"
      @click="handleNodeClick"
    >
      <span class="workspace-tree-node__caret" :class="{ 'is-expanded': isExpanded }">
        <ChevronRight v-if="isDirectory" :size="12" aria-hidden="true" />
      </span>

      <span class="workspace-tree-node__icon" aria-hidden="true">
        <FolderOpen v-if="isDirectory && isExpanded" :size="14" />
        <Folder v-else-if="isDirectory" :size="14" />
        <FileText v-else :size="14" />
      </span>

      <span class="workspace-tree-node__label">{{ node.name }}</span>

      <span class="workspace-tree-node__actions">
        <button type="button" title="系统中显示" @click.stop="revealNode">
          <FolderSearch :size="12" aria-hidden="true" />
        </button>
        <button v-if="isDirectory" type="button" title="新建文件" @click.stop="createChild('file')">
          <FilePlus2 :size="12" aria-hidden="true" />
        </button>
        <button
          v-if="isDirectory"
          type="button"
          title="新建文件夹"
          @click.stop="createChild('directory')"
        >
          <FolderPlus :size="12" aria-hidden="true" />
        </button>
        <button type="button" title="重命名" @click.stop="renameNode">
          <Pencil :size="12" aria-hidden="true" />
        </button>
        <button type="button" title="删除" @click.stop="deleteNode">
          <Trash2 :size="12" aria-hidden="true" />
        </button>
      </span>
    </div>

    <ul v-if="isDirectory && isExpanded" class="workspace-tree-node__children">
      <li v-if="isLoading" class="workspace-tree-node__hint">加载中...</li>
      <li v-else-if="children.length === 0" class="workspace-tree-node__hint">空目录</li>

      <WorkspaceTreeNode
        v-for="child in children"
        v-else
        :key="child.relativePath"
        :node="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<style scoped>
.workspace-tree-node {
  list-style: none;
}

.workspace-tree-node__row {
  --indent-size: 14px;
  display: grid;
  grid-template-columns: 14px 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 3px 6px;
  margin-left: calc(var(--node-depth) * var(--indent-size));
}

.workspace-tree-node__row:hover {
  border-color: rgb(var(--ui-border));
  background: rgb(var(--ui-surface-muted));
}

.workspace-tree-node__row.is-selected {
  border-color: rgb(var(--ui-brand));
  background: rgb(var(--ui-surface-muted));
}

.workspace-tree-node__caret {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--ui-text-muted));
}

.workspace-tree-node__caret.is-expanded {
  transform: rotate(90deg);
}

.workspace-tree-node__icon {
  color: rgb(var(--ui-text-muted));
  display: inline-flex;
  align-items: center;
}

.workspace-tree-node__label {
  min-width: 0;
  font-size: 12px;
  color: rgb(var(--ui-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-tree-node__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 120ms ease;
}

.workspace-tree-node__row:hover .workspace-tree-node__actions,
.workspace-tree-node__row.is-selected .workspace-tree-node__actions {
  opacity: 1;
}

.workspace-tree-node__actions button {
  border: 1px solid rgb(var(--ui-border));
  border-radius: 6px;
  background: rgb(var(--ui-surface));
  color: rgb(var(--ui-text-muted));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
}

.workspace-tree-node__actions button:hover {
  color: rgb(var(--ui-text));
  border-color: rgb(var(--ui-brand));
}

.workspace-tree-node__children {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.workspace-tree-node__hint {
  list-style: none;
  margin: 0;
  font-size: 12px;
  color: rgb(var(--ui-text-muted));
  padding: 4px 6px 4px calc((var(--node-depth) + 1) * 14px + 22px);
}
</style>
