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
  <section
    class="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2.5 overflow-hidden p-3"
  >
    <WorkspaceToolbar />
    <WorkspaceTabs />

    <section
      class="grid min-h-0 grid-cols-[minmax(240px,320px)_minmax(0,1fr)] gap-2.5 overflow-hidden"
    >
      <WorkspaceTree class="min-h-0" />
      <WorkspaceEditorPane v-if="workspaceStore.hasWorkspace" class="min-h-0" />
      <WorkspaceEmptyState v-else class="min-h-0" />
    </section>
  </section>
</template>
