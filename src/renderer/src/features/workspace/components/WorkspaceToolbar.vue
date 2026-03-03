<script setup lang="ts">
import { computed } from 'vue'
import { FolderOpen, RefreshCw, AlertCircle } from 'lucide-vue-next'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'

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
  <section class="workspace-toolbar">
    <div class="workspace-toolbar__meta">
      <p class="workspace-toolbar__label">Workspace</p>
      <p class="workspace-toolbar__path" :title="rootPathLabel">{{ rootPathLabel }}</p>
    </div>

    <div class="workspace-toolbar__actions">
      <button type="button" class="workspace-toolbar__action" @click="handlePickWorkspace">
        <FolderOpen :size="15" aria-hidden="true" />
        打开工作区
      </button>
      <button
        type="button"
        class="workspace-toolbar__action"
        :disabled="!workspaceStore.hasWorkspace"
        @click="handleRefresh"
      >
        <RefreshCw :size="15" aria-hidden="true" />
        刷新
      </button>
    </div>

    <p v-if="hasError" class="workspace-toolbar__error" role="alert">
      <AlertCircle :size="15" aria-hidden="true" />
      {{ workspaceStore.lastError }}
      <button type="button" class="workspace-toolbar__dismiss" @click="workspaceStore.clearError">
        关闭
      </button>
    </p>
  </section>
</template>

<style scoped>
.workspace-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px 16px;
  align-items: center;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 12px;
  background: rgb(var(--ui-surface));
  padding: 12px;
}

.workspace-toolbar__meta {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.workspace-toolbar__label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--ui-text-muted));
  font-weight: 700;
}

.workspace-toolbar__path {
  margin: 0;
  min-width: 0;
  font-size: 13px;
  color: rgb(var(--ui-text));
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.workspace-toolbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.workspace-toolbar__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(var(--ui-border));
  border-radius: 8px;
  background: rgb(var(--ui-surface-muted));
  color: rgb(var(--ui-text));
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

.workspace-toolbar__action:hover:not(:disabled) {
  border-color: rgb(var(--ui-brand));
}

.workspace-toolbar__action:disabled {
  opacity: 0.5;
}

.workspace-toolbar__error {
  grid-column: 1 / -1;
  margin: 0;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  border: 1px solid rgb(var(--brand-300));
  border-radius: 8px;
  background: rgb(var(--brand-50));
  color: rgb(var(--brand-800));
  padding: 7px 10px;
  font-size: 12px;
}

.workspace-toolbar__dismiss {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  text-decoration: underline;
  padding: 0;
}

html[data-theme='dark'] .workspace-toolbar__error {
  border-color: rgb(var(--brand-700));
  background: rgb(var(--brand-900) / 0.45);
  color: rgb(var(--brand-200));
}
</style>
