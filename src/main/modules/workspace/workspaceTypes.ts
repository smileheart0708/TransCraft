export type WorkspaceEntryKind = 'file' | 'directory'

export type WorkspaceWatchEventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

export type WorkspaceErrorCode =
  | 'NO_WORKSPACE'
  | 'INVALID_PATH'
  | 'OUTSIDE_WORKSPACE'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'IS_DIRECTORY'
  | 'BINARY_FILE'
  | 'CONFLICT'

export type WorkspaceStateDTO = {
  rootPath: string | null
}

export type WorkspaceNodeDTO = {
  name: string
  relativePath: string
  kind: WorkspaceEntryKind
  size: number
  mtimeMs: number
}

export type OpenFileDTO = {
  relativePath: string
  name: string
  content: string
  mtimeMs: number
  encoding: 'utf-8'
  isBinary: false
}

export type WriteFileRequestDTO = {
  relativePath: string
  content: string
  expectedMtimeMs: number | null
}

export type WriteFileResultDTO =
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

export type ListChildrenRequestDTO = {
  relativePath: string | null
}

export type CreateEntryRequestDTO = {
  parentRelativePath: string | null
  name: string
  kind: WorkspaceEntryKind
}

export type CreateEntryResultDTO = {
  kind: WorkspaceEntryKind
  relativePath: string
}

export type RenameEntryRequestDTO = {
  relativePath: string
  nextName: string
}

export type RenameEntryResultDTO = {
  fromPath: string
  toPath: string
}

export type DeleteEntryRequestDTO = {
  relativePath: string
  recursive?: boolean
}

export type DeleteEntryResultDTO = {
  deletedPath: string
}

export type RevealInOsRequestDTO = {
  relativePath: string
}

export type WorkspaceFsEventDTO = {
  eventType: WorkspaceWatchEventType
  relativePath: string
  nodeType: WorkspaceEntryKind
}

export type WorkspaceErrorDTO = {
  code: WorkspaceErrorCode
  message: string
  relativePath?: string
  details?: string
}

export type WorkspaceResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: WorkspaceErrorDTO
    }

export class WorkspaceDomainError extends Error {
  readonly code: WorkspaceErrorCode
  readonly relativePath?: string
  readonly details?: string

  constructor(
    code: WorkspaceErrorCode,
    message: string,
    options?: { relativePath?: string; details?: string }
  ) {
    super(message)
    this.name = 'WorkspaceDomainError'
    this.code = code
    this.relativePath = options?.relativePath
    this.details = options?.details
  }
}

export function okResult<T>(data: T): WorkspaceResult<T> {
  return {
    ok: true,
    data
  }
}

export function errorResult<T>(error: WorkspaceErrorDTO): WorkspaceResult<T> {
  return {
    ok: false,
    error
  }
}

export function toWorkspaceErrorDTO(error: unknown): WorkspaceErrorDTO {
  if (error instanceof WorkspaceDomainError) {
    return {
      code: error.code,
      message: error.message,
      relativePath: error.relativePath,
      details: error.details
    }
  }

  if (error instanceof Error) {
    return {
      code: 'INVALID_PATH',
      message: error.message
    }
  }

  return {
    code: 'INVALID_PATH',
    message: 'Unknown workspace error.'
  }
}
