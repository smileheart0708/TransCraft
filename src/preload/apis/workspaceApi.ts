import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'

type WorkspaceEntryKind = 'file' | 'directory'

type WorkspaceErrorCode =
  | 'NO_WORKSPACE'
  | 'INVALID_PATH'
  | 'INVALID_ARCHIVE'
  | 'OUTSIDE_WORKSPACE'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'IS_DIRECTORY'
  | 'BINARY_FILE'
  | 'CONFLICT'
  | 'ARCHIVE_ENTRY_UNSAFE'
  | 'ARCHIVE_EXTRACT_FAILED'

type WorkspaceStateDTO = {
  rootPath: string | null
}

type ImportArchiveResultDTO = {
  rootPath: string | null
  imported: boolean
  importedRootPath: string | null
  archiveFileName: string | null
}

type WorkspaceNodeDTO = {
  name: string
  relativePath: string
  kind: WorkspaceEntryKind
  size: number
  mtimeMs: number
}

type OpenFileDTO = {
  relativePath: string
  name: string
  content: string
  mtimeMs: number
  encoding: 'utf-8'
  isBinary: false
}

type WriteFileRequestDTO = {
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

type CreateEntryRequestDTO = {
  parentRelativePath: string | null
  name: string
  kind: WorkspaceEntryKind
}

type CreateEntryResultDTO = {
  kind: WorkspaceEntryKind
  relativePath: string
}

type RenameEntryRequestDTO = {
  relativePath: string
  nextName: string
}

type RenameEntryResultDTO = {
  fromPath: string
  toPath: string
}

type DeleteEntryRequestDTO = {
  relativePath: string
  recursive?: boolean
}

type DeleteEntryResultDTO = {
  deletedPath: string
}

type RevealInOsRequestDTO = {
  relativePath: string
}

type WorkspaceFsEventDTO = {
  eventType: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
  relativePath: string
  nodeType: WorkspaceEntryKind
}

type WorkspaceErrorDTO = {
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

type WorkspaceWatchStateDTO = {
  watching: boolean
}

export type WorkspaceAPI = {
  getState: () => Promise<WorkspaceResult<WorkspaceStateDTO>>
  pickRoot: () => Promise<WorkspaceResult<WorkspaceStateDTO>>
  importArchive: () => Promise<WorkspaceResult<ImportArchiveResultDTO>>
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

export const workspaceApi: WorkspaceAPI = {
  getState: () =>
    ipcRenderer.invoke('workspace:get-state') as Promise<WorkspaceResult<WorkspaceStateDTO>>,
  pickRoot: () =>
    ipcRenderer.invoke('workspace:pick-root') as Promise<WorkspaceResult<WorkspaceStateDTO>>,
  importArchive: () =>
    ipcRenderer.invoke('workspace:import-archive') as Promise<
      WorkspaceResult<ImportArchiveResultDTO>
    >,
  listChildren: (relativePath) =>
    ipcRenderer.invoke('workspace:list-children', {
      relativePath
    }) as Promise<WorkspaceResult<WorkspaceNodeDTO[]>>,
  readFile: (relativePath) =>
    ipcRenderer.invoke('workspace:read-file', relativePath) as Promise<
      WorkspaceResult<OpenFileDTO>
    >,
  writeFile: (request) =>
    ipcRenderer.invoke('workspace:write-file', request) as Promise<
      WorkspaceResult<WriteFileResultDTO>
    >,
  createEntry: (request) =>
    ipcRenderer.invoke('workspace:create-entry', request) as Promise<
      WorkspaceResult<CreateEntryResultDTO>
    >,
  renameEntry: (request) =>
    ipcRenderer.invoke('workspace:rename-entry', request) as Promise<
      WorkspaceResult<RenameEntryResultDTO>
    >,
  deleteEntry: (request) =>
    ipcRenderer.invoke('workspace:delete-entry', request) as Promise<
      WorkspaceResult<DeleteEntryResultDTO>
    >,
  revealInOs: (request) =>
    ipcRenderer.invoke('workspace:reveal-in-os', request) as Promise<WorkspaceResult<void>>,
  watchStart: () =>
    ipcRenderer.invoke('workspace:watch-start') as Promise<WorkspaceResult<WorkspaceWatchStateDTO>>,
  watchStop: () =>
    ipcRenderer.invoke('workspace:watch-stop') as Promise<WorkspaceResult<WorkspaceWatchStateDTO>>,
  onFsChanged: (listener) => {
    const wrappedListener = (_event: IpcRendererEvent, eventPayload: WorkspaceFsEventDTO): void => {
      listener(eventPayload)
    }

    ipcRenderer.on('workspace:fs-changed', wrappedListener)

    return (): void => {
      ipcRenderer.removeListener('workspace:fs-changed', wrappedListener)
    }
  }
}
