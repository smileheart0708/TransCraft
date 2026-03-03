import { createWriteStream } from 'node:fs'
import { lstat, mkdir, open as openFile, rename, rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
  posix
} from 'node:path'
import yauzl, { type Entry, type ZipFile } from 'yauzl'
import { WorkspaceDomainError } from './workspaceTypes'

const DATA_DIRECTORY_NAME = 'data'
const STAGING_DIRECTORY_PREFIX = '.import-staging-'
const BACKUP_DIRECTORY_PREFIX = '.import-backup-'
const SUPPORTED_ARCHIVE_EXTENSIONS = new Set(['.zip', '.mcworld', '.mcaddon', '.mcpack'])
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
const WINDOWS_INVALID_FILENAME_CHAR = /[<>:"/\\|?*]/
const ZIP_SIGNATURE_LOCAL_FILE_HEADER = 0x04034b50
const ZIP_SIGNATURE_EMPTY_ARCHIVE = 0x06054b50
const ZIP_SIGNATURE_SPANNED_ARCHIVE = 0x08074b50
// TODO(settings): 将 1GB 阈值改为设置页可配置项（读取持久化设置）
export const IMPORT_ARCHIVE_CONFIRM_SIZE_BYTES = 1024 * 1024 * 1024

export type PreparedArchiveImportDTO = {
  archivePath: string
  archiveFileName: string
  archiveSize: number
  dataRootPath: string
  targetRootPath: string
  targetDirectoryName: string
  targetExists: boolean
}

type ExecuteArchiveImportRequest = {
  preparedImport: PreparedArchiveImportDTO
  overwriteExisting: boolean
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

function normalizeArchiveEntryPath(fileName: string): string {
  const normalizedSeparator = fileName.replace(/\\/g, '/')
  const normalizedPath = posix.normalize(normalizedSeparator)

  if (normalizedPath === '' || normalizedPath === '.' || normalizedPath === '..') {
    throw new WorkspaceDomainError('ARCHIVE_ENTRY_UNSAFE', 'Archive entry path is invalid.', {
      relativePath: normalizedPath || undefined
    })
  }

  if (normalizedPath.startsWith('../') || normalizedPath.startsWith('/')) {
    throw new WorkspaceDomainError(
      'ARCHIVE_ENTRY_UNSAFE',
      'Archive entry points outside extraction root.',
      {
        relativePath: normalizedPath
      }
    )
  }

  return normalizedPath
}

function assertPathInside(
  basePath: string,
  targetPath: string,
  relativePathForError: string
): void {
  if (isPathInside(basePath, targetPath)) {
    return
  }

  throw new WorkspaceDomainError(
    'ARCHIVE_ENTRY_UNSAFE',
    'Archive entry points outside extraction root.',
    {
      relativePath: relativePathForError
    }
  )
}

function toArchiveError(error: unknown): WorkspaceDomainError {
  if (error instanceof WorkspaceDomainError) {
    return error
  }

  if (error instanceof Error) {
    return new WorkspaceDomainError('ARCHIVE_EXTRACT_FAILED', 'Failed to extract archive.', {
      details: error.message
    })
  }

  return new WorkspaceDomainError('ARCHIVE_EXTRACT_FAILED', 'Failed to extract archive.')
}

function toArchiveEntryError(error: unknown, relativePath: string): WorkspaceDomainError {
  if (error instanceof WorkspaceDomainError) {
    return error
  }

  if (error instanceof Error) {
    return new WorkspaceDomainError(
      'ARCHIVE_ENTRY_UNSAFE',
      'Archive entry could not be safely extracted.',
      {
        relativePath,
        details: error.message
      }
    )
  }

  return new WorkspaceDomainError(
    'ARCHIVE_ENTRY_UNSAFE',
    'Archive entry could not be safely extracted.',
    {
      relativePath
    }
  )
}

function isZipMagic(signature: number): boolean {
  return (
    signature === ZIP_SIGNATURE_LOCAL_FILE_HEADER ||
    signature === ZIP_SIGNATURE_EMPTY_ARCHIVE ||
    signature === ZIP_SIGNATURE_SPANNED_ARCHIVE
  )
}

function isSupportedExtension(archivePath: string): boolean {
  const archiveExtension = extname(archivePath).toLowerCase()
  return SUPPORTED_ARCHIVE_EXTENSIONS.has(archiveExtension)
}

function sanitizeDirectoryName(sourceName: string): string {
  const parsedName = parse(sourceName).name
  const withoutInvalidChars = [...parsedName]
    .map((character) => {
      if (character.charCodeAt(0) < 32) {
        return '_'
      }

      return WINDOWS_INVALID_FILENAME_CHAR.test(character) ? '_' : character
    })
    .join('')

  const cleaned = withoutInvalidChars
    .replace(/[. ]+$/g, '')
    .trim()
    .replace(/^\.+$/, '')

  let nextName = cleaned || `imported-archive-${Date.now()}`
  if (WINDOWS_RESERVED_NAME.test(nextName)) {
    nextName = `${nextName}-archive`
  }

  if (nextName.length > 96) {
    nextName = nextName
      .slice(0, 96)
      .replace(/[. ]+$/g, '')
      .trim()
  }

  if (!nextName) {
    nextName = `imported-archive-${Date.now()}`
  }

  return nextName
}

function isDirectoryEntry(entry: Entry, normalizedPath: string): boolean {
  return entry.fileName.endsWith('/') || normalizedPath.endsWith('/')
}

function isSymbolicLinkEntry(entry: Entry): boolean {
  const unixFileMode = (entry.externalFileAttributes >>> 16) & 0o170000
  return unixFileMode === 0o120000
}

async function openZipFile(archivePath: string): Promise<ZipFile> {
  return new Promise<ZipFile>((resolvePromise, rejectPromise) => {
    yauzl.open(
      archivePath,
      {
        lazyEntries: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: false
      },
      (error, zipFile) => {
        if (error) {
          rejectPromise(
            new WorkspaceDomainError('INVALID_ARCHIVE', 'Failed to open archive.', {
              details: error.message
            })
          )
          return
        }

        if (!zipFile) {
          rejectPromise(
            new WorkspaceDomainError('INVALID_ARCHIVE', 'Archive file could not be opened.')
          )
          return
        }

        resolvePromise(zipFile)
      }
    )
  })
}

async function openEntryReadStream(zipFile: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> {
  return new Promise<NodeJS.ReadableStream>((resolvePromise, rejectPromise) => {
    zipFile.openReadStream(entry, (error, readStream) => {
      if (error) {
        rejectPromise(error)
        return
      }

      if (!readStream) {
        rejectPromise(new Error('Archive entry stream is unavailable.'))
        return
      }

      resolvePromise(readStream)
    })
  })
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath)
    return true
  } catch {
    return false
  }
}

export class WorkspaceArchiveImportService {
  getSupportedDialogExtensions(): string[] {
    return ['zip', 'mcworld', 'mcaddon', 'mcpack']
  }

  async prepareArchiveImport(
    archivePath: string,
    userDataPath: string
  ): Promise<PreparedArchiveImportDTO> {
    const archiveStats = await lstat(archivePath).catch(() => {
      throw new WorkspaceDomainError('INVALID_ARCHIVE', 'Selected archive does not exist.')
    })

    if (!archiveStats.isFile()) {
      throw new WorkspaceDomainError('INVALID_ARCHIVE', 'Selected archive is not a file.')
    }

    if (!isSupportedExtension(archivePath)) {
      throw new WorkspaceDomainError('INVALID_ARCHIVE', 'Unsupported archive extension.')
    }

    await this.assertZipMagic(archivePath)

    const archiveFileName = basename(archivePath)
    const targetDirectoryName = sanitizeDirectoryName(archiveFileName)
    const dataRootPath = resolve(userDataPath, DATA_DIRECTORY_NAME)
    const targetRootPath = resolve(dataRootPath, targetDirectoryName)

    assertPathInside(dataRootPath, targetRootPath, targetDirectoryName)

    return {
      archivePath,
      archiveFileName,
      archiveSize: archiveStats.size,
      dataRootPath,
      targetRootPath,
      targetDirectoryName,
      targetExists: await pathExists(targetRootPath)
    }
  }

  async executeArchiveImport(request: ExecuteArchiveImportRequest): Promise<string> {
    const { preparedImport, overwriteExisting } = request
    const dataRootPath = preparedImport.dataRootPath
    const targetRootPath = preparedImport.targetRootPath

    await mkdir(dataRootPath, { recursive: true })

    const stagingRootPath = await this.reserveTemporaryPath(
      dataRootPath,
      `${STAGING_DIRECTORY_PREFIX}${preparedImport.targetDirectoryName}`
    )
    let backupRootPath: string | null = null
    let importCommitted = false

    try {
      await mkdir(stagingRootPath, { recursive: false })
      await this.extractArchiveToDirectory(preparedImport.archivePath, stagingRootPath)

      const targetExists = await pathExists(targetRootPath)
      if (targetExists) {
        if (!overwriteExisting) {
          throw new WorkspaceDomainError(
            'ALREADY_EXISTS',
            'A folder with the same archive name already exists.'
          )
        }

        backupRootPath = await this.reserveTemporaryPath(
          dataRootPath,
          `${BACKUP_DIRECTORY_PREFIX}${preparedImport.targetDirectoryName}`
        )
        await rename(targetRootPath, backupRootPath)
      }

      await rename(stagingRootPath, targetRootPath)
      importCommitted = true
    } catch (error) {
      await rm(stagingRootPath, { recursive: true, force: true }).catch(() => undefined)

      if (backupRootPath) {
        const targetStillExists = await pathExists(targetRootPath)
        if (!targetStillExists) {
          await rename(backupRootPath, targetRootPath).catch(() => undefined)
        } else {
          await rm(backupRootPath, { recursive: true, force: true }).catch(() => undefined)
        }
      }

      throw toArchiveError(error)
    }

    if (importCommitted && backupRootPath) {
      await rm(backupRootPath, { recursive: true, force: true }).catch(() => undefined)
    }

    return targetRootPath
  }

  private async assertZipMagic(archivePath: string): Promise<void> {
    const handle = await openFile(archivePath, 'r')
    const signatureBuffer = Buffer.alloc(4)

    try {
      const { bytesRead } = await handle.read(signatureBuffer, 0, signatureBuffer.length, 0)
      if (bytesRead < signatureBuffer.length) {
        throw new WorkspaceDomainError('INVALID_ARCHIVE', 'Archive signature is invalid.')
      }

      const signatureValue = signatureBuffer.readUInt32LE(0)
      if (!isZipMagic(signatureValue)) {
        throw new WorkspaceDomainError('INVALID_ARCHIVE', 'Archive signature is invalid.')
      }
    } finally {
      await handle.close()
    }
  }

  private async reserveTemporaryPath(basePath: string, prefix: string): Promise<string> {
    for (let attempt = 0; attempt < 128; attempt += 1) {
      const randomSuffix = Math.random().toString(36).slice(2, 10)
      const candidatePath = resolve(basePath, `${prefix}-${Date.now()}-${randomSuffix}`)

      assertPathInside(basePath, candidatePath, toPosixPath(relative(basePath, candidatePath)))

      if (!(await pathExists(candidatePath))) {
        return candidatePath
      }
    }

    throw new WorkspaceDomainError(
      'ARCHIVE_EXTRACT_FAILED',
      'Failed to allocate temporary path for archive import.'
    )
  }

  private async extractArchiveToDirectory(
    archivePath: string,
    destinationRootPath: string
  ): Promise<void> {
    const zipFile = await openZipFile(archivePath)

    try {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        let isSettled = false

        const settleWithError = (error: unknown): void => {
          if (isSettled) return
          isSettled = true
          zipFile.close()
          rejectPromise(toArchiveError(error))
        }

        const settleSuccess = (): void => {
          if (isSettled) return
          isSettled = true
          resolvePromise()
        }

        const processEntry = async (entry: Entry): Promise<void> => {
          const validationMessage = yauzl.validateFileName(entry.fileName)
          if (validationMessage) {
            throw new WorkspaceDomainError(
              'ARCHIVE_ENTRY_UNSAFE',
              'Archive contains an invalid entry path.',
              {
                relativePath: entry.fileName,
                details: validationMessage
              }
            )
          }

          const normalizedEntryPath = normalizeArchiveEntryPath(entry.fileName)
          if (isSymbolicLinkEntry(entry)) {
            throw new WorkspaceDomainError(
              'ARCHIVE_ENTRY_UNSAFE',
              'Archive contains a symbolic link entry.',
              {
                relativePath: normalizedEntryPath
              }
            )
          }

          const outputPath = resolve(destinationRootPath, normalizedEntryPath)
          assertPathInside(destinationRootPath, outputPath, normalizedEntryPath)

          if (isDirectoryEntry(entry, normalizedEntryPath)) {
            await mkdir(outputPath, { recursive: true })
            zipFile.readEntry()
            return
          }

          await mkdir(dirname(outputPath), { recursive: true })
          const readStream = await openEntryReadStream(zipFile, entry)
          await pipeline(readStream, createWriteStream(outputPath, { flags: 'wx' }))
          zipFile.readEntry()
        }

        zipFile.on('entry', (entry) => {
          void processEntry(entry).catch((error) => {
            settleWithError(toArchiveEntryError(error, entry.fileName))
          })
        })

        zipFile.once('end', settleSuccess)
        zipFile.once('error', settleWithError)
        zipFile.readEntry()
      })
    } finally {
      zipFile.close()
    }
  }
}
