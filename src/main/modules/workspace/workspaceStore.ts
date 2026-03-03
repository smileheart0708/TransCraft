import ElectronStore from 'electron-store'
import type { WorkspaceStateDTO } from './workspaceTypes'
import { isValidWorkspacePathSync, normalizeWorkspacePath } from './workspacePathValidator'

type WorkspaceStoreSchema = {
  workspace: {
    lastPath: string | null
  }
}

export class WorkspaceStore {
  private readonly store: ElectronStore<WorkspaceStoreSchema>
  private rootPath: string | null

  constructor() {
    this.store = new ElectronStore<WorkspaceStoreSchema>({
      defaults: {
        workspace: {
          lastPath: null
        }
      }
    })

    const persisted = this.store.get('workspace', { lastPath: null }).lastPath
    this.rootPath =
      persisted && isValidWorkspacePathSync(persisted) ? normalizeWorkspacePath(persisted) : null

    if (this.rootPath !== persisted) {
      this.persistRootPath(this.rootPath)
    }
  }

  getRootPath(): string | null {
    return this.rootPath
  }

  setRootPath(nextPath: string | null): void {
    this.rootPath = nextPath ? normalizeWorkspacePath(nextPath) : null
    this.persistRootPath(this.rootPath)
  }

  clearRootPath(): void {
    this.rootPath = null
    this.persistRootPath(null)
  }

  getState(): WorkspaceStateDTO {
    return {
      rootPath: this.rootPath
    }
  }

  private persistRootPath(nextPath: string | null): void {
    this.store.set('workspace', {
      lastPath: nextPath
    })
  }
}
