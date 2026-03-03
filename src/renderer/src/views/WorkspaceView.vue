<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import WorkspaceToolbar from '../components/workspace/WorkspaceToolbar.vue'
import WorkspaceTabs from '../components/workspace/WorkspaceTabs.vue'
import WorkspaceTree from '../components/workspace/WorkspaceTree.vue'
import WorkspaceEditorPane from '../components/workspace/WorkspaceEditorPane.vue'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState.vue'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'

const workspaceStore = useWorkspaceStore()

onMounted(() => {
  void workspaceStore.initializeWorkspace()
})

onBeforeUnmount(() => {
  void workspaceStore.disposeStoreResources()
})
</script>

<template>
  <section class="workspace-view">
    <WorkspaceToolbar />
    <WorkspaceTabs />

    <section class="workspace-view__content">
      <WorkspaceTree />
      <WorkspaceEditorPane v-if="workspaceStore.hasWorkspace" />
      <WorkspaceEmptyState v-else />
    </section>
  </section>
</template>

<style scoped>
.workspace-view {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}

.workspace-view__content {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.workspace-view__content > * {
  min-height: 0;
}

@media (max-width: 960px) {
  .workspace-view__content {
    grid-template-columns: 1fr;
  }

  .workspace-view__content > :first-child {
    min-height: 240px;
  }
}
</style>
