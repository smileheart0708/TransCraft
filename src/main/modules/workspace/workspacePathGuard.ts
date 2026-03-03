import { lstat, realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep, posix } from 'node:path'
import { WorkspaceDomainError } from './workspaceTypes'

const INVALID_ENTRY_NAME = /[\\/\0]/

export type ResolvedWorkspaceRoot = {
  rootPath: string
  realRootPath: string
}

export type ResolvedWorkspacePath = ResolvedWorkspaceRoot & {
  absolutePath: string
  realPath: string
  relativePath: string
}

function toPosixPath(pathValue: string): string {
  return pathValue.split(sep).join('/')
}

function isPathInside(basePath: string, targetPath: string): boolean {
  const pathDiff = relative(basePath, targetPath)
  if (pathDiff === '') return true
  if (pathDiff.startsWith('..')) return false
  return !isAbsolute(pathDiff)
}

export function normalizeRelativePath(relativePath: string | null | undefined): string {
  if (!relativePath) return ''

  const withForwardSlash = relativePath.replace(/\\/g, '/')
  const trimmed = withForwardSlash.trim().replace(/^\/+/, '')

  if (trimmed.includes('\0')) {
    throw new WorkspaceDomainError('INVALID_PATH', 'Path contains invalid null bytes.')
  }

  if (isAbsolute(trimmed)) {
    throw new WorkspaceDomainError(
      'INVALID_PATH',
      'Absolute paths are not allowed in workspace operations.'
    )
  }

  const normalized = posix.normalize(trimmed)

  if (normalized === '.' || normalized === '') {
    return ''
  }

  if (normalized === '..' || normalized.startsWith('../')) {
    throw new WorkspaceDomainError(
      'OUTSIDE_WORKSPACE',
      'The requested path is outside the workspace.'
    )
  }

  return normalized
}

export function validateEntryName(name: string): string {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new WorkspaceDomainError('INVALID_PATH', 'Entry name must not be empty.')
  }

  if (trimmedName === '.' || trimmedName === '..') {
    throw new WorkspaceDomainError('INVALID_PATH', 'Entry name cannot be . or ..')
  }

  if (INVALID_ENTRY_NAME.test(trimmedName)) {
    throw new WorkspaceDomainError('INVALID_PATH', 'Entry name contains invalid characters.')
  }

  return trimmedName
}

export function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  const pathDiff = relative(rootPath, absolutePath)

  if (pathDiff === '') return ''

  if (pathDiff.startsWith('..') || isAbsolute(pathDiff)) {
    throw new WorkspaceDomainError(
      'OUTSIDE_WORKSPACE',
      'The requested path is outside the workspace.'
    )
  }

  return toPosixPath(pathDiff)
}

export class WorkspacePathGuard {
  private readonly getRootPath: () => string | null

  constructor(getRootPath: () => string | null) {
    this.getRootPath = getRootPath
  }

  async resolveWorkspaceRoot(): Promise<ResolvedWorkspaceRoot> {
    const rootPath = this.getRootPath()
    if (!rootPath) {
      throw new WorkspaceDomainError('NO_WORKSPACE', 'No workspace is currently open.')
    }

    const realRootPath = await realpath(rootPath).catch(() => {
      throw new WorkspaceDomainError('INVALID_PATH', 'Current workspace path is invalid.')
    })

    return {
      rootPath,
      realRootPath
    }
  }

  async resolveExistingPath(
    requestedRelativePath: string | null | undefined
  ): Promise<ResolvedWorkspacePath> {
    const normalizedRelativePath = normalizeRelativePath(requestedRelativePath)
    const { rootPath, realRootPath } = await this.resolveWorkspaceRoot()

    const absolutePath = resolve(rootPath, normalizedRelativePath)

    if (!isPathInside(rootPath, absolutePath)) {
      throw new WorkspaceDomainError(
        'OUTSIDE_WORKSPACE',
        'The requested path is outside the workspace.',
        {
          relativePath: normalizedRelativePath
        }
      )
    }

    const stats = await lstat(absolutePath).catch(() => {
      throw new WorkspaceDomainError('NOT_FOUND', 'The requested path does not exist.', {
        relativePath: normalizedRelativePath
      })
    })

    const realPath = await realpath(absolutePath).catch(() => {
      throw new WorkspaceDomainError('NOT_FOUND', 'The requested path does not exist.', {
        relativePath: normalizedRelativePath
      })
    })

    if (!isPathInside(realRootPath, realPath)) {
      throw new WorkspaceDomainError(
        'OUTSIDE_WORKSPACE',
        'The requested path resolves outside the workspace.',
        {
          relativePath: normalizedRelativePath
        }
      )
    }

    return {
      rootPath,
      realRootPath,
      absolutePath,
      realPath,
      relativePath:
        stats.isDirectory() && normalizedRelativePath === '' ? '' : normalizedRelativePath
    }
  }
}
