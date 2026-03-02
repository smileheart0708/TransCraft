import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  type DesktopPlatform = 'win32' | 'darwin' | 'linux'

  interface TitleBarWindowState {
    isMaximized: boolean
    isFullScreen: boolean
    isFocused: boolean
  }

  interface TitleBarAPI {
    getState: () => Promise<TitleBarWindowState>
    onStateChange: (listener: (state: TitleBarWindowState) => void) => () => void
    getPlatform: () => DesktopPlatform
  }

  interface RendererAPI {
    titleBar: TitleBarAPI
  }

  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}
