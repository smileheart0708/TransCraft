import { ipcRenderer } from 'electron'

export type ThemePreference = 'system' | 'light' | 'dark'

export type ThemeAPI = {
  getPreference: () => Promise<ThemePreference>
  setPreference: (preference: ThemePreference) => Promise<void>
}

export const themeApi: ThemeAPI = {
  getPreference: () => ipcRenderer.invoke('theme:get-preference') as Promise<ThemePreference>,
  setPreference: (preference) =>
    ipcRenderer.invoke('theme:set-preference', preference) as Promise<void>
}
