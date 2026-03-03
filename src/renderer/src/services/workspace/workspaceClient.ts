export class WorkspaceClientError extends Error {
  readonly code: WorkspaceErrorCode
  readonly relativePath: string | undefined
  readonly details: string | undefined

  constructor(error: WorkspaceErrorDTO) {
    super(error.message)
    this.name = 'WorkspaceClientError'
    this.code = error.code
    this.relativePath = error.relativePath
    this.details = error.details
  }
}

function unwrapResult<T>(result: WorkspaceResult<T>): T {
  if (result.ok) {
    return result.data
  }

  throw new WorkspaceClientError(result.error)
}

export const workspaceClient = {
  async getState(): Promise<WorkspaceStateDTO> {
    const response = await window.api.workspace.getState()
    return unwrapResult(response)
  },

  async pickRoot(): Promise<WorkspaceStateDTO> {
    const response = await window.api.workspace.pickRoot()
    return unwrapResult(response)
  },

  async importArchive(): Promise<ImportArchiveResultDTO> {
    const response = await window.api.workspace.importArchive()
    return unwrapResult(response)
  },

  async listChildren(relativePath: string | null): Promise<WorkspaceNodeDTO[]> {
    const response = await window.api.workspace.listChildren(relativePath)
    return unwrapResult(response)
  },

  async readFile(relativePath: string): Promise<OpenFileDTO> {
    const response = await window.api.workspace.readFile(relativePath)
    return unwrapResult(response)
  },

  async writeFile(request: WriteFileRequestDTO): Promise<WriteFileResultDTO> {
    const response = await window.api.workspace.writeFile(request)
    return unwrapResult(response)
  },

  async createEntry(request: CreateEntryRequestDTO): Promise<CreateEntryResultDTO> {
    const response = await window.api.workspace.createEntry(request)
    return unwrapResult(response)
  },

  async renameEntry(request: RenameEntryRequestDTO): Promise<RenameEntryResultDTO> {
    const response = await window.api.workspace.renameEntry(request)
    return unwrapResult(response)
  },

  async deleteEntry(request: DeleteEntryRequestDTO): Promise<DeleteEntryResultDTO> {
    const response = await window.api.workspace.deleteEntry(request)
    return unwrapResult(response)
  },

  async revealInOs(request: RevealInOsRequestDTO): Promise<void> {
    const response = await window.api.workspace.revealInOs(request)
    unwrapResult(response)
  },

  async watchStart(): Promise<WorkspaceWatchStateDTO> {
    const response = await window.api.workspace.watchStart()
    return unwrapResult(response)
  },

  async watchStop(): Promise<WorkspaceWatchStateDTO> {
    const response = await window.api.workspace.watchStop()
    return unwrapResult(response)
  },

  onFsChanged(listener: (event: WorkspaceFsEventDTO) => void): () => void {
    return window.api.workspace.onFsChanged(listener)
  }
}
