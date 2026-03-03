import type { ElectronAPI } from '@electron-toolkit/preload'

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

  type WorkspaceEntryKind = 'file' | 'directory'

  type WorkspaceErrorCode =
    | 'NO_WORKSPACE'
    | 'INVALID_PATH'
    | 'OUTSIDE_WORKSPACE'
    | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'PERMISSION_DENIED'
    | 'IS_DIRECTORY'
    | 'BINARY_FILE'
    | 'CONFLICT'

  interface WorkspaceStateDTO {
    rootPath: string | null
  }

  interface WorkspaceNodeDTO {
    name: string
    relativePath: string
    kind: WorkspaceEntryKind
    size: number
    mtimeMs: number
  }

  interface OpenFileDTO {
    relativePath: string
    name: string
    content: string
    mtimeMs: number
    encoding: 'utf-8'
    isBinary: false
  }

  interface WriteFileRequestDTO {
    relativePath: string
    content: string
    expectedMtimeMs: number | null
  }

  type WriteFileResultDTO =
    | {
        ok: true
        relativePath: string
        mtimeMs: number
      }
    | {
        ok: false
        error: WorkspaceErrorDTO & {
          code: 'CONFLICT'
          currentMtimeMs: number
        }
      }

  interface CreateEntryRequestDTO {
    parentRelativePath: string | null
    name: string
    kind: WorkspaceEntryKind
  }

  interface CreateEntryResultDTO {
    kind: WorkspaceEntryKind
    relativePath: string
  }

  interface RenameEntryRequestDTO {
    relativePath: string
    nextName: string
  }

  interface RenameEntryResultDTO {
    fromPath: string
    toPath: string
  }

  interface DeleteEntryRequestDTO {
    relativePath: string
    recursive?: boolean
  }

  interface DeleteEntryResultDTO {
    deletedPath: string
  }

  interface RevealInOsRequestDTO {
    relativePath: string
  }

  interface WorkspaceFsEventDTO {
    eventType: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
    relativePath: string
    nodeType: WorkspaceEntryKind
  }

  interface WorkspaceErrorDTO {
    code: WorkspaceErrorCode
    message: string
    relativePath?: string
    details?: string
  }

  type WorkspaceResult<T> =
    | {
        ok: true
        data: T
      }
    | {
        ok: false
        error: WorkspaceErrorDTO
      }

  interface WorkspaceWatchStateDTO {
    watching: boolean
  }

  interface WorkspaceAPI {
    getState: () => Promise<WorkspaceResult<WorkspaceStateDTO>>
    pickRoot: () => Promise<WorkspaceResult<WorkspaceStateDTO>>
    listChildren: (relativePath: string | null) => Promise<WorkspaceResult<WorkspaceNodeDTO[]>>
    readFile: (relativePath: string) => Promise<WorkspaceResult<OpenFileDTO>>
    writeFile: (request: WriteFileRequestDTO) => Promise<WorkspaceResult<WriteFileResultDTO>>
    createEntry: (request: CreateEntryRequestDTO) => Promise<WorkspaceResult<CreateEntryResultDTO>>
    renameEntry: (request: RenameEntryRequestDTO) => Promise<WorkspaceResult<RenameEntryResultDTO>>
    deleteEntry: (request: DeleteEntryRequestDTO) => Promise<WorkspaceResult<DeleteEntryResultDTO>>
    revealInOs: (request: RevealInOsRequestDTO) => Promise<WorkspaceResult<void>>
    watchStart: () => Promise<WorkspaceResult<WorkspaceWatchStateDTO>>
    watchStop: () => Promise<WorkspaceResult<WorkspaceWatchStateDTO>>
    onFsChanged: (listener: (event: WorkspaceFsEventDTO) => void) => () => void
  }

  interface RendererAPI {
    titleBar: TitleBarAPI
    theme: ThemeAPI
    updater: UpdaterAPI
    workspace: WorkspaceAPI
  }

  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}

export {}
