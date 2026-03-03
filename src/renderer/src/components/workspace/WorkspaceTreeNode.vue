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
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import type { WorkspaceEntryKind, WorkspaceNodeDTO } from '../../types/workspace'

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
const hintIndent = computed(() => ({
  paddingLeft: `calc((${props.depth} + 1) * 14px + 22px)`
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
  <li class="list-none">
    <div
      class="group grid min-h-7.5 grid-cols-[14px_16px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-0.75 hover:border-border hover:bg-surface-muted"
      :class="{
        'border-brand bg-surface-muted': isSelected
      }"
      :style="[rowIndent, { marginLeft: 'calc(var(--node-depth) * 14px)' }]"
      :title="node.relativePath"
      @click="handleNodeClick"
    >
      <span class="inline-flex h-3.5 w-3.5 items-center justify-center text-text-muted">
        <ChevronRight
          v-if="isDirectory"
          :size="12"
          aria-hidden="true"
          :class="isExpanded ? 'rotate-90' : ''"
        />
      </span>

      <span class="inline-flex items-center text-text-muted" aria-hidden="true">
        <FolderOpen v-if="isDirectory && isExpanded" :size="14" />
        <Folder v-else-if="isDirectory" :size="14" />
        <FileText v-else :size="14" />
      </span>

      <span class="ellipsis text-xs text-text">{{ node.name }}</span>

      <span
        class="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        :class="isSelected ? 'opacity-100' : ''"
      >
        <UiIconButton variant="surface" size="xs" title="系统中显示" @click.stop="revealNode">
          <FolderSearch :size="12" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton
          v-if="isDirectory"
          variant="surface"
          size="xs"
          title="新建文件"
          @click.stop="createChild('file')"
        >
          <FilePlus2 :size="12" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton
          v-if="isDirectory"
          variant="surface"
          size="xs"
          title="新建文件夹"
          @click.stop="createChild('directory')"
        >
          <FolderPlus :size="12" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton variant="surface" size="xs" title="重命名" @click.stop="renameNode">
          <Pencil :size="12" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton variant="surface" size="xs" title="删除" @click.stop="deleteNode">
          <Trash2 :size="12" aria-hidden="true" />
        </UiIconButton>
      </span>
    </div>

    <ul v-if="isDirectory && isExpanded" class="m-0 grid gap-0.5 p-0">
      <li v-if="isLoading" class="hint-text list-none px-1.5 py-1" :style="hintIndent">
        加载中...
      </li>
      <li
        v-else-if="children.length === 0"
        class="hint-text list-none px-1.5 py-1"
        :style="hintIndent"
      >
        空目录
      </li>

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
