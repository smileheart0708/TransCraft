<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FileWarning } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { CodeEditorService } from '../../services/workspace/codeEditorService'

const workspaceStore = useWorkspaceStore()

const editorHostRef = ref<HTMLElement | null>(null)
let editorService: CodeEditorService | null = null
let mountedEditorPath: string | null = null

const activeTab = computed(() => workspaceStore.activeTab)
const canEdit = computed(() => Boolean(activeTab.value && !activeTab.value.isBinary))

function ensureEditorMounted(): void {
  if (!canEdit.value || !editorHostRef.value) {
    editorService?.destroy()
    editorService = null
    mountedEditorPath = null
    return
  }

  const currentPath = activeTab.value?.relativePath ?? ''
  const currentContent = activeTab.value?.content ?? ''

  if (!editorService) {
    editorService = new CodeEditorService({
      onChange: (nextContent: string) => {
        workspaceStore.updateActiveTabContent(nextContent)
      },
      onSaveShortcut: () => {
        void workspaceStore.saveActiveTab()
      }
    })
  }

  if (mountedEditorPath !== currentPath) {
    editorService.mount(editorHostRef.value, currentContent, currentPath)
    mountedEditorPath = currentPath
    return
  }

  editorService.setContent(currentContent)
}

watch(
  () => activeTab.value?.relativePath,
  () => {
    ensureEditorMounted()
  }
)

watch(
  () => activeTab.value?.content,
  () => {
    if (!editorService || !canEdit.value) return
    editorService.setContent(activeTab.value?.content ?? '')
  }
)

onMounted(() => {
  ensureEditorMounted()
})

onBeforeUnmount(() => {
  editorService?.destroy()
  editorService = null
  mountedEditorPath = null
})
</script>

<template>
  <section class="workspace-editor">
    <div v-if="!activeTab" class="workspace-editor__placeholder">
      <p>从左侧文件树中选择一个文件开始预览与编辑。</p>
    </div>

    <div v-else-if="activeTab.isBinary" class="workspace-editor__binary">
      <FileWarning :size="18" aria-hidden="true" />
      <p class="workspace-editor__binary-title">Binary file is not editable</p>
      <p class="workspace-editor__binary-message">{{ activeTab.binaryMessage }}</p>
    </div>

    <div v-else class="workspace-editor__surface">
      <div ref="editorHostRef" class="workspace-editor__host"></div>
      <footer class="workspace-editor__statusbar">
        <span class="workspace-editor__path">{{ activeTab.relativePath }}</span>
        <span class="workspace-editor__dirty" :class="{ 'is-visible': activeTab.isDirty }"
          >● 未保存</span
        >
      </footer>
    </div>
  </section>
</template>

<style scoped>
.workspace-editor {
  min-width: 0;
  min-height: 0;
  height: 100%;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 12px;
  background: rgb(var(--ui-surface));
  overflow: hidden;
}

.workspace-editor__placeholder,
.workspace-editor__binary {
  height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  color: rgb(var(--ui-text-muted));
  text-align: center;
}

.workspace-editor__placeholder p,
.workspace-editor__binary p {
  margin: 0;
}

.workspace-editor__binary-title {
  font-size: 14px;
  color: rgb(var(--ui-text));
  font-weight: 600;
}

.workspace-editor__binary-message {
  max-width: 46ch;
  font-size: 12px;
}

.workspace-editor__surface {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 1fr auto;
}

.workspace-editor__host {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.workspace-editor__statusbar {
  border-top: 1px solid rgb(var(--ui-border));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  font-size: 11px;
  color: rgb(var(--ui-text-muted));
  background: rgb(var(--ui-surface-muted));
}

.workspace-editor__path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-editor__dirty {
  visibility: hidden;
  color: rgb(var(--ui-brand-emphasis));
  font-weight: 600;
}

.workspace-editor__dirty.is-visible {
  visibility: visible;
}
</style>
