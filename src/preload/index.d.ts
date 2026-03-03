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

  type ThemePreference = 'system' | 'light' | 'dark'

  interface ThemeAPI {
    getPreference: () => Promise<ThemePreference>
    setPreference: (preference: ThemePreference) => Promise<void>
  }

  interface UpdaterAPI {
    checkForUpdates: () => Promise<void>
  }

  interface RendererAPI {
    titleBar: TitleBarAPI
    theme: ThemeAPI
    updater: UpdaterAPI
  }

  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}
