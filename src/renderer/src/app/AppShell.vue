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

const isMacPlatform = computed(() => platform.value === 'darwin')
const isMaximized = computed(() => windowState.value.isMaximized || windowState.value.isFullScreen)
const isFocused = computed(() => windowState.value.isFocused)

const shellClasses = computed(() => ({
  'platform-win32': platform.value === 'win32',
  'platform-darwin': platform.value === 'darwin',
  'platform-linux': platform.value === 'linux',
  'is-maximized': isMaximized.value,
  'is-focused': isFocused.value,
  'is-blurred': !isFocused.value
}))

const titlebarClasses = computed(() => [
  'fixed left-0 top-0 z-[1000] h-[env(titlebar-area-height,var(--tb-height))] w-full select-none [backdrop-filter:blur(12px)]',
  isFocused.value ? 'bg-[rgb(var(--ui-titlebar))]' : 'bg-[rgb(var(--ui-titlebar-inactive))]'
])

const titlebarContentClasses = computed(() => [
  'relative left-[env(titlebar-area-x,0)] grid h-full w-[env(titlebar-area-width,100%)] grid-cols-[max-content_1fr_max-content] items-center gap-2.5 px-3 max-[620px]:grid-cols-[1fr_max-content]',
  isMacPlatform.value ? (isMaximized.value ? 'pl-16' : 'pl-[var(--tb-mac-left-padding)]') : ''
])

const windowControlsSpacerClasses = computed(() =>
  isMacPlatform.value ? 'w-0' : 'w-[var(--tb-controls-width)]'
)

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
  <div :class="shellClasses" class="relative h-full min-h-0">
    <header
      :class="titlebarClasses"
      style="-webkit-app-region: drag; -webkit-user-select: none; user-select: none"
    >
      <div :class="titlebarContentClasses">
        <div class="flex min-w-55 items-center gap-2.5 max-[760px]:min-w-0">
          <img src="@resources/logo.svg" alt="" class="h-3.75 w-3.75 shrink-0" aria-hidden="true" />
        </div>

        <div class="flex min-w-0 items-center justify-end gap-2">
          <ThemeSwitcher style="-webkit-app-region: no-drag" />
          <div aria-hidden="true" :class="windowControlsSpacerClasses"></div>
        </div>
      </div>
    </header>

    <main
      class="relative h-full min-h-0 overflow-hidden pt-[env(titlebar-area-height,var(--tb-height))] *:h-full *:min-h-0"
    >
      <RouterView />
    </main>
  </div>
</template>
