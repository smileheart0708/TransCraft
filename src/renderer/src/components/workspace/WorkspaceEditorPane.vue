<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FileWarning } from 'lucide-vue-next'
import UiPanel from '@renderer/components/ui/UiPanel.vue'
import WorkspaceTabs from './WorkspaceTabs.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { CodeEditorService } from '../../services/workspace/codeEditorService'

const workspaceStore = useWorkspaceStore()

const editorHostRef = ref<HTMLElement | null>(null)
let editorService: CodeEditorService | null = null
let mountedEditorPath: string | null = null

const activeTab = computed(() => workspaceStore.activeTab)
const canEdit = computed(() => Boolean(activeTab.value && !activeTab.value.isBinary))
const hasOpenTabs = computed(() => workspaceStore.openTabs.length > 0)

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
  <UiPanel as="section" full-height class="min-w-0 overflow-hidden">
    <div
      class="grid h-full min-h-0"
      :class="hasOpenTabs ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]'"
    >
      <WorkspaceTabs v-if="hasOpenTabs" />

      <div
        v-if="!activeTab"
        class="grid h-full min-h-0 place-content-center justify-items-center gap-4 p-6 text-center text-text-muted"
      >
        <img
          src="@resources/logo-mark.svg"
          alt=""
          class="workspace-empty-logo"
          draggable="false"
          aria-hidden="true"
        />
        <p class="m-0 text-xs">从左侧文件树中选择一个文件开始预览与编辑。</p>
      </div>

      <div
        v-else-if="activeTab.isBinary"
        class="grid h-full min-h-0 place-content-center justify-items-center gap-2 p-6 text-center text-text-muted"
      >
        <FileWarning :size="18" aria-hidden="true" />
        <p class="m-0 text-sm font-semibold text-text">Binary file is not editable</p>
        <p class="m-0 max-w-[46ch] text-xs">{{ activeTab.binaryMessage }}</p>
      </div>

      <div v-else class="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        <div ref="editorHostRef" class="h-full min-h-0 overflow-hidden"></div>
        <footer class="statusbar">
          <span class="ellipsis">{{ activeTab.relativePath }}</span>
          <span
            :class="activeTab.isDirty ? 'visible font-semibold text-brand-emphasis' : 'invisible'"
            >● 未保存</span
          >
        </footer>
      </div>
    </div>
  </UiPanel>
</template>

<style scoped>
.workspace-empty-logo {
  width: min(38vw, 240px);
  max-width: 240px;
  opacity: 0.16;
  -webkit-user-drag: none;
  user-select: none;
}
</style>
