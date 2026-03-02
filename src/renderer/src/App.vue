<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ThemeSwitcher from '@renderer/components/common/ThemeSwitcher.vue'

const tabs = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'translate', label: 'Translate' },
  { id: 'history', label: 'History' }
] as const

type TabId = (typeof tabs)[number]['id']
type AppPlatform = ReturnType<(typeof window.api.titleBar)['getPlatform']>
type AppWindowState = Awaited<ReturnType<(typeof window.api.titleBar)['getState']>>

type WindowControlsOverlayLike = {
  visible: boolean
  addEventListener: (type: 'geometrychange', listener: () => void) => void
  removeEventListener: (type: 'geometrychange', listener: () => void) => void
}

const activeTab = ref<TabId>('workspace')
const platform = ref<AppPlatform>(window.api.titleBar.getPlatform())
const windowState = ref<AppWindowState>({
  isMaximized: false,
  isFullScreen: false,
  isFocused: true
})

const shellClasses = computed(() => ({
  'platform-win32': platform.value === 'win32',
  'platform-darwin': platform.value === 'darwin',
  'platform-linux': platform.value === 'linux',
  'is-maximized': windowState.value.isMaximized || windowState.value.isFullScreen,
  'is-focused': windowState.value.isFocused,
  'is-blurred': !windowState.value.isFocused
}))

const setActiveTab = (tabId: TabId): void => {
  activeTab.value = tabId
}

const overlay = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlayLike })
  .windowControlsOverlay

const syncOverlayState = (): void => {
  document.documentElement.dataset['wco'] = overlay?.visible ? 'visible' : 'hidden'
}

const updateWindowState = (nextState: AppWindowState): void => {
  windowState.value = nextState
}

const onOverlayGeometryChange = (): void => {
  syncOverlayState()
}

let disposeStateListener: (() => void) | null = null

onMounted(async () => {
  const initialState = await window.api.titleBar.getState()
  updateWindowState(initialState)

  disposeStateListener = window.api.titleBar.onStateChange(updateWindowState)
  overlay?.addEventListener('geometrychange', onOverlayGeometryChange)
  syncOverlayState()
})

onBeforeUnmount(() => {
  disposeStateListener?.()
  overlay?.removeEventListener('geometrychange', onOverlayGeometryChange)
})
</script>

<template>
  <div class="app-shell" :class="shellClasses">
    <header class="immersive-titlebar">
      <div class="tb-content">
        <div class="tb-left">
          <span aria-hidden="true" class="tb-logo-dot"></span>
          <span class="tb-workspace">TransCraft Workspace</span>
        </div>

        <div class="tb-center">
          <nav class="tb-tabs" aria-label="Primary tabs" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tb-tab tb-control"
              :class="{ 'is-active': activeTab === tab.id }"
              role="tab"
              type="button"
              :aria-selected="activeTab === tab.id"
              @click="setActiveTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="tb-right">
          <ThemeSwitcher class="tb-control" />
          <div aria-hidden="true" class="tb-window-controls-spacer"></div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <section class="workspace-intro">
        <p class="workspace-kicker">Workspace</p>
        <h1 class="workspace-title">TransCraft</h1>
        <p class="workspace-description">
          基础设施已完成：主题令牌、全局深浅色切换、标题栏同步与可复用组件均已就绪。
        </p>
      </section>
    </main>
  </div>
</template>
