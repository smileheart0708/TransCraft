<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppVersions from './components/AppVersions.vue'

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

const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

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
        <div class="tb-left tb-no-drag">
          <img alt="logo" class="tb-logo" src="./assets/electron.svg" />
          <span class="tb-workspace">TransCraft Workspace</span>
        </div>

        <div class="tb-center">
          <nav class="tb-tabs tb-no-drag" aria-label="Primary tabs" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tb-tab"
              :class="{ 'is-active': activeTab === tab.id }"
              role="tab"
              type="button"
              @click="setActiveTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="tb-right">
          <div aria-hidden="true" class="tb-window-controls-spacer"></div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <img alt="logo" class="logo" src="./assets/electron.svg" />
      <div class="creator">Powered by electron-vite</div>
      <div class="text">
        Build an Electron app with
        <span class="vue">Vue</span>
        and
        <span class="ts">TypeScript</span>
      </div>
      <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
      <div class="actions">
        <div class="action">
          <a href="https://electron-vite.org/" rel="noreferrer" target="_blank">Documentation</a>
        </div>
        <div class="action">
          <a rel="noreferrer" target="_blank" @click="ipcHandle">发送 IPC</a>
        </div>
      </div>
      <AppVersions />
    </main>
  </div>
</template>
