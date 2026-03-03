import { app, dialog, ipcMain } from 'electron'
import { requireSenderWindow } from '../../ipc/senderGuard'
import {
  IMPORT_ARCHIVE_CONFIRM_SIZE_BYTES,
  WorkspaceArchiveImportService
} from './workspaceArchiveImportService'
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
  type ImportArchiveResultDTO,
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
  const workspaceArchiveImportService = new WorkspaceArchiveImportService()

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
      'workspace:import-archive',
      async (event) => {
        return withWorkspaceResult(async () => {
          const senderWindow = requireSenderWindow(
            event as Parameters<typeof requireSenderWindow>[0]
          )

          const selection = await dialog.showOpenDialog(senderWindow, {
            title: 'Import Archive Workspace',
            properties: ['openFile'],
            filters: [
              {
                name: 'Archive Files',
                extensions: workspaceArchiveImportService.getSupportedDialogExtensions()
              }
            ]
          })

          const cancelledResult: ImportArchiveResultDTO = {
            rootPath: workspaceStore.getRootPath(),
            imported: false,
            importedRootPath: null,
            archiveFileName: null
          }

          if (selection.canceled || selection.filePaths.length === 0) {
            return cancelledResult
          }

          const selectedArchivePath = selection.filePaths[0]
          if (!selectedArchivePath) {
            return cancelledResult
          }

          const preparedImport = await workspaceArchiveImportService.prepareArchiveImport(
            selectedArchivePath,
            app.getPath('userData')
          )

          if (preparedImport.archiveSize > IMPORT_ARCHIVE_CONFIRM_SIZE_BYTES) {
            const sizeConfirm = await dialog.showMessageBox(senderWindow, {
              type: 'warning',
              title: 'Large Archive Detected',
              message: 'The selected archive is larger than 1GB. Continue importing?',
              detail:
                'Importing very large archives may take longer and consume substantial disk space.',
              buttons: ['Continue Import', 'Cancel'],
              defaultId: 0,
              cancelId: 1,
              noLink: true
            })

            if (sizeConfirm.response !== 0) {
              return cancelledResult
            }
          }

          let overwriteExisting = false
          if (preparedImport.targetExists) {
            const overwriteConfirm = await dialog.showMessageBox(senderWindow, {
              type: 'warning',
              title: 'Existing Import Folder',
              message: `Folder "${preparedImport.targetDirectoryName}" already exists. Replace it?`,
              detail: 'Replacing will overwrite the previous imported data in that folder.',
              buttons: ['Replace', 'Cancel'],
              defaultId: 0,
              cancelId: 1,
              noLink: true
            })

            if (overwriteConfirm.response !== 0) {
              return cancelledResult
            }

            overwriteExisting = true
          }

          const importedRootPath = await workspaceArchiveImportService.executeArchiveImport({
            preparedImport,
            overwriteExisting
          })

          workspaceStore.setRootPath(normalizeWorkspacePath(importedRootPath))
          await workspaceWatchService.refreshIfWatching(senderWindow, workspaceStore.getRootPath())

          return {
            rootPath: workspaceStore.getRootPath(),
            imported: true,
            importedRootPath: importedRootPath,
            archiveFileName: preparedImport.archiveFileName
          } satisfies ImportArchiveResultDTO
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
