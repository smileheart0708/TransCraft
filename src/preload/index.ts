import type { IpcRendererEvent } from 'electron'
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type DesktopPlatform = 'win32' | 'darwin' | 'linux'

type TitleBarWindowState = {
  isMaximized: boolean
  isFullScreen: boolean
  isFocused: boolean
}

type TitleBarStateListener = (state: TitleBarWindowState) => void

type TitleBarAPI = {
  getState: () => Promise<TitleBarWindowState>
  onStateChange: (listener: TitleBarStateListener) => () => void
  getPlatform: () => DesktopPlatform
}

type ThemePreference = 'auto' | 'light' | 'dark'
type MainThemePreference = 'system' | 'light' | 'dark'

type ThemeAPI = {
  setPreference: (preference: ThemePreference) => Promise<void>
}

type UpdaterAPI = {
  checkForUpdates: () => Promise<void>
}

type RendererAPI = {
  titleBar: TitleBarAPI
  theme: ThemeAPI
  updater: UpdaterAPI
}

function getPlatform(): DesktopPlatform {
  switch (process.platform) {
    case 'win32':
    case 'darwin':
    case 'linux':
      return process.platform
    default:
      return 'linux'
  }
}

const api: RendererAPI = {
  titleBar: {
    getState: () => ipcRenderer.invoke('titlebar:get-state') as Promise<TitleBarWindowState>,
    onStateChange: (listener) => {
      const wrappedListener = (_event: IpcRendererEvent, state: TitleBarWindowState): void => {
        listener(state)
      }

      ipcRenderer.on('titlebar:state-changed', wrappedListener)

      return (): void => {
        ipcRenderer.removeListener('titlebar:state-changed', wrappedListener)
      }
    },
    getPlatform
  },
  theme: {
    setPreference: (preference) =>
      ipcRenderer.invoke(
        'theme:set-preference',
        (preference === 'auto' ? 'system' : preference) as MainThemePreference
      ) as Promise<void>
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates') as Promise<void>
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
