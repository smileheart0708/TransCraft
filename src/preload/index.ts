import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { titleBarApi, type TitleBarAPI } from './apis/titleBarApi'
import { themeApi, type ThemeAPI } from './apis/themeApi'
import { updaterApi, type UpdaterAPI } from './apis/updaterApi'
import { workspaceApi, type WorkspaceAPI } from './apis/workspaceApi'

type RendererAPI = {
  titleBar: TitleBarAPI
  theme: ThemeAPI
  updater: UpdaterAPI
  workspace: WorkspaceAPI
}

const api: RendererAPI = {
  titleBar: titleBarApi,
  theme: themeApi,
  updater: updaterApi,
  workspace: workspaceApi
}

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
