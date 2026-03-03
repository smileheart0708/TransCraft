export type WorkspaceEntryKind = 'file' | 'directory'

export type WorkspaceNodeDTO = {
  name: string
  relativePath: string
  kind: WorkspaceEntryKind
  size: number
  mtimeMs: number
}

export type WorkspaceTab = {
  relativePath: string
  title: string
  content: string
  savedContent: string
  mtimeMs: number
  isDirty: boolean
  isBinary: boolean
  binaryMessage: string | null
}

export const ROOT_PARENT_KEY = '__ROOT__'

export function toParentKey(relativePath: string | null): string {
  return relativePath ?? ROOT_PARENT_KEY
}

export function getParentPath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) return null

  const lastSlashIndex = normalized.lastIndexOf('/')
  if (lastSlashIndex === -1) return null

  return normalized.slice(0, lastSlashIndex)
}

export function getBaseName(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) return ''

  const lastSlashIndex = normalized.lastIndexOf('/')
  return lastSlashIndex === -1 ? normalized : normalized.slice(lastSlashIndex + 1)
}

export function normalizeRelativeInput(input: string): string {
  return input.replace(/\\/g, '/').trim().replace(/^\/+/, '').replace(/\/+$/, '')
}
