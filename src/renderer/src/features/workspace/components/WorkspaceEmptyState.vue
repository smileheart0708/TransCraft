<template>
  <section class="workspace-empty" aria-live="polite">
    <p class="workspace-empty__kicker">Workspace</p>
    <h2 class="workspace-empty__title">No workspace open</h2>
    <p class="workspace-empty__description">
      选择一个目录后，左侧会展示完整文件树，右侧可直接预览和编辑文本文件。
    </p>
  </section>
</template>

<style scoped>
.workspace-empty {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;
  min-height: 100%;
  border: 1px dashed rgb(var(--ui-border));
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgb(var(--ui-surface-muted) / 0.72) 0%,
    rgb(var(--ui-surface) / 0.82) 55%,
    rgb(var(--ui-surface)) 100%
  );
  padding: 30px;
}

.workspace-empty__kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ui-text-muted));
  font-weight: 700;
}

.workspace-empty__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  color: rgb(var(--ui-text));
}

.workspace-empty__description {
  margin: 0;
  max-width: 44ch;
  font-size: 14px;
  line-height: 1.7;
  color: rgb(var(--ui-text-muted));
}
</style>
