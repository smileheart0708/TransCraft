import {
  accessSync,
  constants as fsConstants,
  existsSync,
  promises as fsPromises,
  statSync
} from 'node:fs'
import { resolve } from 'node:path'

function normalizeCandidatePath(candidatePath: string): string {
  return resolve(candidatePath)
}

export function isValidWorkspacePathSync(candidatePath: string | null | undefined): boolean {
  if (!candidatePath) return false

  try {
    const normalizedPath = normalizeCandidatePath(candidatePath)

    if (!existsSync(normalizedPath)) {
      return false
    }

    const stats = statSync(normalizedPath)
    if (!stats.isDirectory()) {
      return false
    }

    accessSync(normalizedPath, fsConstants.R_OK | fsConstants.W_OK)
    return true
  } catch {
    return false
  }
}

export async function isValidWorkspacePath(
  candidatePath: string | null | undefined
): Promise<boolean> {
  if (!candidatePath) return false

  try {
    const normalizedPath = normalizeCandidatePath(candidatePath)
    const stats = await fsPromises.stat(normalizedPath)

    if (!stats.isDirectory()) {
      return false
    }

    await fsPromises.access(normalizedPath, fsConstants.R_OK | fsConstants.W_OK)
    return true
  } catch {
    return false
  }
}

export function normalizeWorkspacePath(candidatePath: string): string {
  return normalizeCandidatePath(candidatePath)
}
