import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'

export type DesktopPlatform = 'win32' | 'darwin' | 'linux'

export type TitleBarWindowState = {
  isMaximized: boolean
  isFullScreen: boolean
  isFocused: boolean
}

export type TitleBarStateListener = (state: TitleBarWindowState) => void

export type TitleBarAPI = {
  getState: () => Promise<TitleBarWindowState>
  onStateChange: (listener: TitleBarStateListener) => () => void
  getPlatform: () => DesktopPlatform
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

export const titleBarApi: TitleBarAPI = {
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
}
