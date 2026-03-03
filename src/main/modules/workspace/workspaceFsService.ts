import { shell } from 'electron'
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile as writeFileWithFs
} from 'node:fs/promises'
import writeFileAtomic from 'write-file-atomic'
import { basename, dirname, resolve, relative, isAbsolute } from 'node:path'
import {
  WorkspacePathGuard,
  toWorkspaceRelativePath,
  validateEntryName
} from './workspacePathGuard'
import type { WorkspaceStore } from './workspaceStore'
import {
  type CreateEntryRequestDTO,
  type CreateEntryResultDTO,
  type DeleteEntryRequestDTO,
  type DeleteEntryResultDTO,
  type ListChildrenRequestDTO,
  type OpenFileDTO,
  type RenameEntryRequestDTO,
  type RenameEntryResultDTO,
  type RevealInOsRequestDTO,
  WorkspaceDomainError,
  type WorkspaceEntryKind,
  type WorkspaceNodeDTO,
  type WorkspaceStateDTO,
  type WriteFileRequestDTO,
  type WriteFileResultDTO
} from './workspaceTypes'

function isLikelyBinary(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 8000)
  if (sampleLength === 0) return false

  let suspiciousCount = 0

  for (let index = 0; index < sampleLength; index += 1) {
    const currentByte = buffer[index]
    if (currentByte === undefined) {
      continue
    }

    if (currentByte === 0) {
      return true
    }

    if (
      (currentByte < 7 || (currentByte > 14 && currentByte < 32)) &&
      currentByte !== 9 &&
      currentByte !== 10
    ) {
      suspiciousCount += 1
    }
  }

  return suspiciousCount / sampleLength > 0.3
}

function toNodeKind(isDirectory: boolean): WorkspaceEntryKind {
  return isDirectory ? 'directory' : 'file'
}

function assertInsideRoot(
  realRootPath: string,
  targetPath: string,
  relativePathForError: string
): void {
  const pathDiff = relative(realRootPath, targetPath)
  if (pathDiff.startsWith('..') || isAbsolute(pathDiff)) {
    throw new WorkspaceDomainError(
      'OUTSIDE_WORKSPACE',
      'The requested path is outside the workspace.',
      {
        relativePath: relativePathForError
      }
    )
  }
}

function sortNodes(nodes: WorkspaceNodeDTO[]): WorkspaceNodeDTO[] {
  return nodes.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1
    }

    return left.name.localeCompare(right.name, 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base'
    })
  })
}

export class WorkspaceFsService {
  private readonly workspaceStore: WorkspaceStore
  private readonly pathGuard: WorkspacePathGuard

  constructor(workspaceStore: WorkspaceStore, pathGuard: WorkspacePathGuard) {
    this.workspaceStore = workspaceStore
    this.pathGuard = pathGuard
  }

  getState(): WorkspaceStateDTO {
    return this.workspaceStore.getState()
  }

  async listChildren(request: ListChildrenRequestDTO): Promise<WorkspaceNodeDTO[]> {
    const resolvedParent = await this.pathGuard.resolveExistingPath(request.relativePath)
    const parentStats = await stat(resolvedParent.absolutePath)

    if (!parentStats.isDirectory()) {
      throw new WorkspaceDomainError('IS_DIRECTORY', 'The requested path is not a directory.', {
        relativePath: resolvedParent.relativePath
      })
    }

    const dirEntries = await readdir(resolvedParent.absolutePath, { withFileTypes: true })
    const nodes: WorkspaceNodeDTO[] = []

    for (const dirEntry of dirEntries) {
      if (dirEntry.isSymbolicLink()) {
        continue
      }

      if (!dirEntry.isDirectory() && !dirEntry.isFile()) {
        continue
      }

      const childAbsolutePath = resolve(resolvedParent.absolutePath, dirEntry.name)
      assertInsideRoot(resolvedParent.realRootPath, childAbsolutePath, resolvedParent.relativePath)

      const childStats = await stat(childAbsolutePath)
      nodes.push({
        name: dirEntry.name,
        relativePath: toWorkspaceRelativePath(resolvedParent.rootPath, childAbsolutePath),
        kind: toNodeKind(childStats.isDirectory()),
        size: childStats.isFile() ? childStats.size : 0,
        mtimeMs: childStats.mtimeMs
      })
    }

    return sortNodes(nodes)
  }

  async readFile(relativePath: string): Promise<OpenFileDTO> {
    const resolvedFilePath = await this.pathGuard.resolveExistingPath(relativePath)
    const fileStats = await stat(resolvedFilePath.absolutePath)

    if (fileStats.isDirectory()) {
      throw new WorkspaceDomainError('IS_DIRECTORY', 'Cannot read a directory as a text file.', {
        relativePath: resolvedFilePath.relativePath
      })
    }

    const fileBuffer = await readFile(resolvedFilePath.absolutePath)

    if (isLikelyBinary(fileBuffer)) {
      throw new WorkspaceDomainError(
        'BINARY_FILE',
        'This file appears to be binary and cannot be previewed.',
        {
          relativePath: resolvedFilePath.relativePath
        }
      )
    }

    return {
      relativePath: resolvedFilePath.relativePath,
      name: basename(resolvedFilePath.absolutePath),
      content: fileBuffer.toString('utf-8'),
      mtimeMs: fileStats.mtimeMs,
      encoding: 'utf-8',
      isBinary: false
    }
  }

  async writeFile(request: WriteFileRequestDTO): Promise<WriteFileResultDTO> {
    const resolvedFilePath = await this.pathGuard.resolveExistingPath(request.relativePath)
    const fileStats = await stat(resolvedFilePath.absolutePath)

    if (fileStats.isDirectory()) {
      throw new WorkspaceDomainError('IS_DIRECTORY', 'Cannot write to a directory.', {
        relativePath: resolvedFilePath.relativePath
      })
    }

    if (
      request.expectedMtimeMs !== null &&
      Math.floor(fileStats.mtimeMs) !== Math.floor(request.expectedMtimeMs)
    ) {
      return {
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'The file has changed on disk. Please reload before saving.',
          relativePath: resolvedFilePath.relativePath,
          currentMtimeMs: fileStats.mtimeMs
        }
      }
    }

    await writeFileAtomic(resolvedFilePath.absolutePath, request.content, {
      encoding: 'utf-8'
    })

    const updatedStats = await stat(resolvedFilePath.absolutePath)

    return {
      ok: true,
      relativePath: resolvedFilePath.relativePath,
      mtimeMs: updatedStats.mtimeMs
    }
  }

  async createEntry(request: CreateEntryRequestDTO): Promise<CreateEntryResultDTO> {
    const parentPath = await this.pathGuard.resolveExistingPath(request.parentRelativePath)
    const parentStats = await stat(parentPath.absolutePath)

    if (!parentStats.isDirectory()) {
      throw new WorkspaceDomainError('IS_DIRECTORY', 'The parent path is not a directory.', {
        relativePath: parentPath.relativePath
      })
    }

    const entryName = validateEntryName(request.name)
    const targetAbsolutePath = resolve(parentPath.absolutePath, entryName)
    const targetRelativePath = toWorkspaceRelativePath(parentPath.rootPath, targetAbsolutePath)

    assertInsideRoot(parentPath.realRootPath, targetAbsolutePath, targetRelativePath)

    const exists = await lstat(targetAbsolutePath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      throw new WorkspaceDomainError(
        'ALREADY_EXISTS',
        'A file or directory with the same name already exists.',
        {
          relativePath: targetRelativePath
        }
      )
    }

    if (request.kind === 'directory') {
      await mkdir(targetAbsolutePath, { recursive: false })
    } else {
      await writeFileWithFs(targetAbsolutePath, '', {
        encoding: 'utf-8',
        flag: 'wx'
      })
    }

    return {
      kind: request.kind,
      relativePath: targetRelativePath
    }
  }

  async renameEntry(request: RenameEntryRequestDTO): Promise<RenameEntryResultDTO> {
    const currentPath = await this.pathGuard.resolveExistingPath(request.relativePath)
    const nextName = validateEntryName(request.nextName)
    const nextAbsolutePath = resolve(dirname(currentPath.absolutePath), nextName)
    const nextRelativePath = toWorkspaceRelativePath(currentPath.rootPath, nextAbsolutePath)

    assertInsideRoot(currentPath.realRootPath, nextAbsolutePath, nextRelativePath)

    const exists = await lstat(nextAbsolutePath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      throw new WorkspaceDomainError(
        'ALREADY_EXISTS',
        'A file or directory with the same name already exists.',
        {
          relativePath: nextRelativePath
        }
      )
    }

    await rename(currentPath.absolutePath, nextAbsolutePath)

    return {
      fromPath: currentPath.relativePath,
      toPath: nextRelativePath
    }
  }

  async deleteEntry(request: DeleteEntryRequestDTO): Promise<DeleteEntryResultDTO> {
    const targetPath = await this.pathGuard.resolveExistingPath(request.relativePath)
    const targetStats = await stat(targetPath.absolutePath)

    if (targetStats.isDirectory()) {
      await rm(targetPath.absolutePath, {
        recursive: true,
        force: false
      })
    } else {
      await unlink(targetPath.absolutePath)
    }

    return {
      deletedPath: targetPath.relativePath
    }
  }

  async revealInOs(request: RevealInOsRequestDTO): Promise<void> {
    const targetPath = await this.pathGuard.resolveExistingPath(request.relativePath)
    const targetStats = await stat(targetPath.absolutePath)

    if (targetStats.isDirectory()) {
      const maybeError = await shell.openPath(targetPath.absolutePath)
      if (maybeError) {
        throw new WorkspaceDomainError(
          'PERMISSION_DENIED',
          'Failed to reveal directory in the operating system.'
        )
      }
      return
    }

    shell.showItemInFolder(targetPath.absolutePath)
  }
}
