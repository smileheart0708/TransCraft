import { app, dialog, ipcMain } from 'electron'
import { requireSenderWindow } from '../../ipc/senderGuard'
import { WorkspaceFsService } from './workspaceFsService'
import { WorkspacePathGuard } from './workspacePathGuard'
import { isValidWorkspacePath, normalizeWorkspacePath } from './workspacePathValidator'
import { WorkspaceStore } from './workspaceStore'
import {
  errorResult,
  okResult,
  toWorkspaceErrorDTO,
  type CreateEntryRequestDTO,
  type DeleteEntryRequestDTO,
  type ListChildrenRequestDTO,
  type RenameEntryRequestDTO,
  type RevealInOsRequestDTO,
  type WorkspaceResult,
  type WriteFileRequestDTO
} from './workspaceTypes'
import { WorkspaceWatchService } from './workspaceWatchService'

type WorkspaceIpcRegistration = {
  workspaceStore: WorkspaceStore
  dispose: () => Promise<void>
}

async function withWorkspaceResult<T>(action: () => Promise<T> | T): Promise<WorkspaceResult<T>> {
  try {
    return okResult(await action())
  } catch (error) {
    return errorResult(toWorkspaceErrorDTO(error))
  }
}

export function registerWorkspaceIpc(): WorkspaceIpcRegistration {
  const workspaceStore = new WorkspaceStore()
  const pathGuard = new WorkspacePathGuard(() => workspaceStore.getRootPath())
  const workspaceFsService = new WorkspaceFsService(workspaceStore, pathGuard)
  const workspaceWatchService = new WorkspaceWatchService()

  const channelHandlers: Array<
    [string, (...args: unknown[]) => Promise<WorkspaceResult<unknown>>]
  > = [
    [
      'workspace:get-state',
      () =>
        withWorkspaceResult(() => {
          return workspaceStore.getState()
        })
    ],
    [
      'workspace:pick-root',
      async (event) => {
        return withWorkspaceResult(async () => {
          const senderWindow = requireSenderWindow(
            event as Parameters<typeof requireSenderWindow>[0]
          )

          const selection = await dialog.showOpenDialog(senderWindow, {
            title: 'Open Workspace',
            properties: ['openDirectory']
          })

          if (selection.canceled || selection.filePaths.length === 0) {
            return workspaceStore.getState()
          }

          const pickedPath = selection.filePaths[0]
          if (!pickedPath) {
            return workspaceStore.getState()
          }

          const isValidSelection = await isValidWorkspacePath(pickedPath)

          if (!isValidSelection) {
            workspaceStore.clearRootPath()
            await workspaceWatchService.refreshIfWatching(senderWindow, null)
            return workspaceStore.getState()
          }

          workspaceStore.setRootPath(normalizeWorkspacePath(pickedPath))
          await workspaceWatchService.refreshIfWatching(senderWindow, workspaceStore.getRootPath())
          return workspaceStore.getState()
        })
      }
    ],
    [
      'workspace:list-children',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.listChildren(request as ListChildrenRequestDTO)
        })
      }
    ],
    [
      'workspace:read-file',
      async (_event, relativePath) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.readFile(relativePath as string)
        })
      }
    ],
    [
      'workspace:write-file',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.writeFile(request as WriteFileRequestDTO)
        })
      }
    ],
    [
      'workspace:create-entry',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.createEntry(request as CreateEntryRequestDTO)
        })
      }
    ],
    [
      'workspace:rename-entry',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.renameEntry(request as RenameEntryRequestDTO)
        })
      }
    ],
    [
      'workspace:delete-entry',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          return workspaceFsService.deleteEntry(request as DeleteEntryRequestDTO)
        })
      }
    ],
    [
      'workspace:reveal-in-os',
      async (_event, request) => {
        return withWorkspaceResult(async () => {
          await workspaceFsService.revealInOs(request as RevealInOsRequestDTO)
        })
      }
    ],
    [
      'workspace:watch-start',
      async (event) => {
        return withWorkspaceResult(async () => {
          const senderWindow = requireSenderWindow(
            event as Parameters<typeof requireSenderWindow>[0]
          )
          await workspaceWatchService.startForWindow(senderWindow, workspaceStore.getRootPath())
          return {
            watching: Boolean(workspaceStore.getRootPath())
          }
        })
      }
    ],
    [
      'workspace:watch-stop',
      async (event) => {
        return withWorkspaceResult(async () => {
          const senderWindow = requireSenderWindow(
            event as Parameters<typeof requireSenderWindow>[0]
          )
          await workspaceWatchService.stopForWindow(senderWindow)
          return {
            watching: false
          }
        })
      }
    ]
  ]

  for (const [channel, handler] of channelHandlers) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, (...args) => handler(...args))
  }

  app.on('browser-window-created', (_appEvent, window) => {
    const windowId = window.id
    window.on('closed', () => {
      void workspaceWatchService.stopForWindowById(windowId).catch((error) => {
        console.error('[workspace:watch] failed to stop watcher for closed window', error)
      })
    })
  })

  return {
    workspaceStore,
    dispose: async () => {
      for (const [channel] of channelHandlers) {
        ipcMain.removeHandler(channel)
      }

      await workspaceWatchService.stopAll()
    }
  }
}
