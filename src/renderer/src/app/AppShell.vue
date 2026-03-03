<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import ThemeSwitcher from '@renderer/components/common/ThemeSwitcher.vue'

type AppPlatform = ReturnType<(typeof window.api.titleBar)['getPlatform']>
type AppWindowState = Awaited<ReturnType<(typeof window.api.titleBar)['getState']>>

type WindowControlsOverlayLike = {
  visible: boolean
  addEventListener: (type: 'geometrychange', listener: () => void) => void
  removeEventListener: (type: 'geometrychange', listener: () => void) => void
}

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
          <img src="@resources/logo.svg" alt="" class="tb-logo-icon" aria-hidden="true" />
          <span class="tb-workspace">TransCraft Workspace</span>
        </div>

        <div class="tb-center">
          <span class="tb-title-pill">Workspace</span>
        </div>

        <div class="tb-right">
          <ThemeSwitcher class="tb-control" />
          <div aria-hidden="true" class="tb-window-controls-spacer"></div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
