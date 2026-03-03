<script setup lang="ts">
import UiPanel from '@renderer/components/ui/UiPanel.vue'
</script>

<template>
  <UiPanel
    as="section"
    tone="dashed"
    padding="lg"
    class="grid min-h-full content-center justify-items-start gap-2.5"
    aria-live="polite"
  >
    <p class="kicker tracking-[0.12em]">Workspace</p>
    <h2 class="m-0 text-2xl leading-tight text-text">No workspace open</h2>
    <p class="m-0 max-w-[44ch] text-sm leading-[1.7] text-text-muted">
      选择一个目录后，左侧会展示完整文件树，右侧可直接预览和编辑文本文件。
    </p>
  </UiPanel>
</template>
