<script setup lang="ts">
import { computed } from 'vue'
import { Save, X } from 'lucide-vue-next'
import UiButton from '@renderer/components/ui/UiButton.vue'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

const workspaceStore = useWorkspaceStore()

const hasOpenTabs = computed(() => workspaceStore.openTabs.length > 0)
</script>

<template>
  <section
    class="panel relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 py-1.75 max-[760px]:grid-cols-1"
  >
    <div class="min-w-0">
      <div class="flex min-w-0 gap-1.5 overflow-x-auto pb-px [scrollbar-width:thin]">
        <button
          v-for="tab in workspaceStore.openTabs"
          :key="tab.relativePath"
          type="button"
          class="inline-flex min-w-0 max-w-60 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-text-muted transition-colors hover:border-brand hover:bg-surface-muted hover:text-text"
          :class="{
            'border-brand bg-surface-muted text-text':
              workspaceStore.activeTabPath === tab.relativePath
          }"
          :title="tab.relativePath"
          @click="workspaceStore.setActiveTab(tab.relativePath)"
        >
          <span
            class="text-[10px] leading-none text-brand-emphasis"
            :class="tab.isDirty ? 'visible' : 'invisible'"
            >●</span
          >
          <span class="ellipsis text-xs">{{ tab.title }}</span>
          <span
            class="inline-flex items-center justify-center rounded-md p-px hover:bg-surface"
            @click.stop="workspaceStore.closeTab(tab.relativePath)"
          >
            <X :size="12" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>

    <UiButton
      variant="soft"
      size="sm"
      class="max-[760px]:justify-self-end"
      :disabled="
        !workspaceStore.activeTab ||
        !workspaceStore.activeTab.isDirty ||
        workspaceStore.activeTab.isBinary
      "
      @click="workspaceStore.saveActiveTab"
    >
      <Save :size="14" aria-hidden="true" />
      保存
    </UiButton>

    <p v-if="!hasOpenTabs" class="pointer-events-none absolute left-3 m-0 text-xs text-text-muted">
      尚未打开文件
    </p>
  </section>
</template>
