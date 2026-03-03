<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { LayoutPanelTop } from 'lucide-vue-next'
import ThemeSwitcher from '@renderer/components/common/ThemeSwitcher.vue'
import UiIconButton from '@renderer/components/ui/UiIconButton.vue'
import UiDropdown from '@renderer/components/ui/UiDropdown.vue'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'

type FileMenuItem = {
  value: string
  label: string
}

const fileMenuItems: FileMenuItem[] = [{ value: 'open-workspace', label: '打开工作区' }]
const workspaceStore = useWorkspaceStore()

const isFileMenuOpen = ref(false)
const isAnyMenuOpen = computed(() => isFileMenuOpen.value)

function handleFileMenuSelect(value: string): void {
  isFileMenuOpen.value = false

  if (value === 'open-workspace') {
    void workspaceStore.pickWorkspace()
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.altKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    isFileMenuOpen.value = !isFileMenuOpen.value
  }
}

function handleTitlebarSpacerPointerDown(): void {
  if (!isAnyMenuOpen.value) return
  isFileMenuOpen.value = false
}

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
  'relative left-[env(titlebar-area-x,0)] grid h-full w-[env(titlebar-area-width,100%)] grid-cols-[max-content_1fr_max-content] items-center gap-2.5 px-3',
  isMacPlatform.value ? (isMaximized.value ? 'pl-16' : 'pl-[var(--tb-mac-left-padding)]') : ''
])

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

  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  disposeStateListener?.()
  overlay?.removeEventListener('geometrychange', onOverlayGeometryChange)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div :class="shellClasses" class="relative h-full min-h-0">
    <header
      :class="titlebarClasses"
      style="-webkit-app-region: drag; -webkit-user-select: none; user-select: none"
    >
      <div :class="titlebarContentClasses" style="-webkit-app-region: no-drag">
        <div class="flex min-w-55 items-center gap-2.5 max-[760px]:min-w-0">
          <img src="@resources/logo.svg" alt="" class="h-3.75 w-3.75 shrink-0" aria-hidden="true" />
          <UiDropdown
            :items="fileMenuItems"
            model-value=""
            :open="isFileMenuOpen"
            placement="bottom-start"
            @update:open="isFileMenuOpen = $event"
            @select="handleFileMenuSelect"
          >
            <template #trigger="{ open }">
              <button
                type="button"
                class="rounded px-2 py-1 text-text transition-colors hover:bg-surface-muted"
                style="font-size: 14px"
                :aria-expanded="open"
                aria-haspopup="menu"
                @click="isFileMenuOpen = !isFileMenuOpen"
              >
                文件(F)
              </button>
            </template>
          </UiDropdown>
        </div>

        <div
          class="min-w-0 self-stretch"
          :style="isAnyMenuOpen ? '-webkit-app-region: no-drag' : '-webkit-app-region: drag'"
          @pointerdown="handleTitlebarSpacerPointerDown"
        />

        <div class="flex min-w-0 items-center justify-end gap-2">
          <UiIconButton aria-label="布局面板">
            <LayoutPanelTop :size="16" />
          </UiIconButton>
          <ThemeSwitcher />
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
