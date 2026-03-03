import { relative, isAbsolute, sep } from 'node:path'
import type { BrowserWindow } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
import type {
  WorkspaceEntryKind,
  WorkspaceFsEventDTO,
  WorkspaceWatchEventType
} from './workspaceTypes'

type WindowWatchRegistration = {
  rootPath: string
  watcher: FSWatcher
}

function toPosixPath(pathValue: string): string {
  return pathValue.split(sep).join('/')
}

function toRelativePath(rootPath: string, absolutePath: string): string | null {
  const pathDiff = relative(rootPath, absolutePath)

  if (pathDiff === '') {
    return ''
  }

  if (pathDiff.startsWith('..') || isAbsolute(pathDiff)) {
    return null
  }

  return toPosixPath(pathDiff)
}

function toNodeType(eventType: WorkspaceWatchEventType): WorkspaceEntryKind {
  if (eventType === 'addDir' || eventType === 'unlinkDir') {
    return 'directory'
  }

  return 'file'
}

function isWorkspaceWatchEvent(value: string): value is WorkspaceWatchEventType {
  return (
    value === 'add' ||
    value === 'addDir' ||
    value === 'change' ||
    value === 'unlink' ||
    value === 'unlinkDir'
  )
}

export class WorkspaceWatchService {
  private readonly watchersByWindowId = new Map<number, WindowWatchRegistration>()

  async startForWindow(window: BrowserWindow, rootPath: string | null): Promise<void> {
    await this.stopForWindow(window)

    if (!rootPath || window.isDestroyed()) {
      return
    }

    const watcher = chokidar.watch(rootPath, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 120,
        pollInterval: 20
      },
      ignored: [/[/\\]\.git([/\\]|$)/, /[/\\]node_modules([/\\]|$)/]
    })

    watcher.on('all', (eventName, changedPath) => {
      if (window.isDestroyed() || !isWorkspaceWatchEvent(eventName)) {
        return
      }

      const relativePath = toRelativePath(rootPath, changedPath)
      if (relativePath === null) {
        return
      }

      const payload: WorkspaceFsEventDTO = {
        eventType: eventName,
        relativePath,
        nodeType: toNodeType(eventName)
      }

      try {
        window.webContents.send('workspace:fs-changed', payload)
      } catch (error) {
        console.error('[workspace:watch] failed to send fs event to renderer', error)
      }
    })

    watcher.on('error', (error) => {
      console.error('[workspace:watch] watcher error', error)
    })

    this.watchersByWindowId.set(window.id, {
      rootPath,
      watcher
    })
  }

  async stopForWindow(window: BrowserWindow): Promise<void> {
    const existing = this.watchersByWindowId.get(window.id)
    if (!existing) return

    this.watchersByWindowId.delete(window.id)
    await existing.watcher.close()
  }

  async stopForWindowById(windowId: number): Promise<void> {
    const existing = this.watchersByWindowId.get(windowId)
    if (!existing) return

    this.watchersByWindowId.delete(windowId)
    await existing.watcher.close()
  }

  async refreshIfWatching(window: BrowserWindow, nextRootPath: string | null): Promise<void> {
    if (!this.watchersByWindowId.has(window.id)) {
      return
    }

    await this.startForWindow(window, nextRootPath)
  }

  async stopAll(): Promise<void> {
    const pendingClosures: Promise<void>[] = []

    for (const entry of this.watchersByWindowId.values()) {
      pendingClosures.push(entry.watcher.close())
    }

    this.watchersByWindowId.clear()
    await Promise.allSettled(pendingClosures)
  }
}
