import { ipcRenderer } from 'electron'

export type UpdaterAPI = {
  checkForUpdates: () => Promise<void>
}

export const updaterApi: UpdaterAPI = {
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates') as Promise<void>
}
