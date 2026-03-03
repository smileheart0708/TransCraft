<script setup lang="ts">
import { computed } from 'vue'
import { FolderOpen, RefreshCw, AlertCircle } from 'lucide-vue-next'
import UiPanel from '@renderer/components/ui/UiPanel.vue'
import UiButton from '@renderer/components/ui/UiButton.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

const workspaceStore = useWorkspaceStore()

const rootPathLabel = computed(() => workspaceStore.rootPath ?? '未选择工作区')

const hasError = computed(() => Boolean(workspaceStore.lastError))

async function handlePickWorkspace(): Promise<void> {
  await workspaceStore.pickWorkspace()
}

async function handleRefresh(): Promise<void> {
  await workspaceStore.refreshLoadedTree()
}
</script>

<template>
  <UiPanel
    as="section"
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 p-3 max-[760px]:grid-cols-1"
  >
    <div class="grid min-w-0 gap-0.75">
      <p class="kicker">Workspace</p>
      <p class="ellipsis m-0 text-[13px] text-text" :title="rootPathLabel">{{ rootPathLabel }}</p>
    </div>

    <div class="inline-flex items-center gap-2">
      <UiButton variant="soft" size="sm" @click="handlePickWorkspace">
        <FolderOpen :size="15" aria-hidden="true" />
        打开工作区
      </UiButton>
      <UiButton
        variant="soft"
        size="sm"
        :disabled="!workspaceStore.hasWorkspace"
        @click="handleRefresh"
      >
        <RefreshCw :size="15" aria-hidden="true" />
        刷新
      </UiButton>
    </div>

    <p
      v-if="hasError"
      class="dark:border-[rgb(var(--brand-700))] dark:bg-[rgb(var(--brand-900)/0.45)] dark:text-[rgb(var(--brand-200))] col-span-full m-0 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[rgb(var(--brand-300))] bg-[rgb(var(--brand-50))] px-2.5 py-1.75 text-xs text-[rgb(var(--brand-800))]"
      role="alert"
    >
      <AlertCircle :size="15" aria-hidden="true" />
      {{ workspaceStore.lastError }}
      <button
        type="button"
        class="cursor-pointer bg-transparent p-0 text-xs underline"
        @click="workspaceStore.clearError"
      >
        关闭
      </button>
    </p>
  </UiPanel>
</template>
