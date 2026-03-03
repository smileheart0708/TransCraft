import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { workspaceClient, WorkspaceClientError } from '../services/workspace/workspaceClient'
import {
  ROOT_PARENT_KEY,
  getBaseName,
  getParentPath,
  normalizeRelativeInput,
  toParentKey,
  type WorkspaceEntryKind,
  type WorkspaceNodeDTO,
  type WorkspaceTab
} from '../types/workspace'

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof WorkspaceClientError) {
    return `[${error.code}] ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}

function startsWithPathPrefix(targetPath: string, prefixPath: string): boolean {
  return targetPath === prefixPath || targetPath.startsWith(`${prefixPath}/`)
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const rootPath = ref<string | null>(null)
  const childrenByParent = ref<Record<string, WorkspaceNodeDTO[]>>({
    [ROOT_PARENT_KEY]: []
  })
  const expandedByPath = ref<Record<string, boolean>>({})
  const loadingByParent = ref<Record<string, boolean>>({})

  const openTabs = ref<WorkspaceTab[]>([])
  const activeTabPath = ref<string | null>(null)
  const selectedPath = ref<string | null>(null)
  const renamingPath = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const isWatching = ref(false)

  let fsEventDisposer: (() => void) | null = null

  const hasWorkspace = computed(() => Boolean(rootPath.value))
  const rootNodes = computed(() => childrenByParent.value[ROOT_PARENT_KEY] ?? [])
  const activeTab = computed(() => {
    if (!activeTabPath.value) return null
    return openTabs.value.find((tab) => tab.relativePath === activeTabPath.value) ?? null
  })

  function clearError(): void {
    lastError.value = null
  }

  function setError(message: string): void {
    lastError.value = message
  }

  function resetTreeState(): void {
    childrenByParent.value = {
      [ROOT_PARENT_KEY]: []
    }
    expandedByPath.value = {}
    loadingByParent.value = {}
    selectedPath.value = null
    renamingPath.value = null
  }

  function resetTabsState(): void {
    openTabs.value = []
    activeTabPath.value = null
  }

  function getChildren(parentRelativePath: string | null): WorkspaceNodeDTO[] {
    return childrenByParent.value[toParentKey(parentRelativePath)] ?? []
  }

  function hasLoadedChildren(parentRelativePath: string | null): boolean {
    const key = toParentKey(parentRelativePath)
    return Object.prototype.hasOwnProperty.call(childrenByParent.value, key)
  }

  function isExpanded(relativePath: string): boolean {
    return expandedByPath.value[relativePath] === true
  }

  function isParentLoading(parentRelativePath: string | null): boolean {
    return loadingByParent.value[toParentKey(parentRelativePath)] === true
  }

  function findNode(relativePath: string): WorkspaceNodeDTO | null {
    for (const nodeList of Object.values(childrenByParent.value)) {
      const target = nodeList.find((node) => node.relativePath === relativePath)
      if (target) return target
    }

    return null
  }

  function setSelectedPath(nextPath: string | null): void {
    selectedPath.value = nextPath
  }

  function startRename(relativePath: string): void {
    selectedPath.value = relativePath
    renamingPath.value = relativePath
  }

  function stopRename(): void {
    renamingPath.value = null
  }

  function setLoading(parentRelativePath: string | null, nextValue: boolean): void {
    const key = toParentKey(parentRelativePath)
    loadingByParent.value = {
      ...loadingByParent.value,
      [key]: nextValue
    }
  }

  async function loadChildren(parentRelativePath: string | null): Promise<void> {
    if (!hasWorkspace.value) return

    setLoading(parentRelativePath, true)

    try {
      const nodes = await workspaceClient.listChildren(parentRelativePath)
      const key = toParentKey(parentRelativePath)
      childrenByParent.value = {
        ...childrenByParent.value,
        [key]: nodes
      }
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to load workspace nodes.'))
    } finally {
      setLoading(parentRelativePath, false)
    }
  }

  async function refreshLoadedTree(): Promise<void> {
    if (!hasWorkspace.value) return

    await loadChildren(null)

    const expandedPaths = Object.entries(expandedByPath.value)
      .filter((entry) => entry[1])
      .map((entry) => entry[0])

    for (const expandedPath of expandedPaths) {
      await loadChildren(expandedPath)
    }
  }

  async function refreshWorkspaceState(): Promise<void> {
    try {
      const nextState = await workspaceClient.getState()
      const hasRootChanged = nextState.rootPath !== rootPath.value

      rootPath.value = nextState.rootPath

      if (!nextState.rootPath) {
        resetTreeState()
        resetTabsState()
        await stopWatch()
        return
      }

      if (hasRootChanged) {
        resetTreeState()
        resetTabsState()
      }
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to read workspace state.'))
    }
  }

  async function initializeWorkspace(): Promise<void> {
    await refreshWorkspaceState()

    if (!hasWorkspace.value) return

    await loadChildren(null)
    await startWatch()
  }

  async function pickWorkspace(): Promise<void> {
    try {
      const nextState = await workspaceClient.pickRoot()
      const hasRootChanged = nextState.rootPath !== rootPath.value

      rootPath.value = nextState.rootPath

      if (!nextState.rootPath) {
        resetTreeState()
        resetTabsState()
        await stopWatch()
        return
      }

      if (hasRootChanged) {
        resetTreeState()
        resetTabsState()
      }

      await loadChildren(null)
      await startWatch()
      clearError()
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to pick workspace folder.'))
    }
  }

  async function toggleDirectory(relativePath: string): Promise<void> {
    const currentlyExpanded = isExpanded(relativePath)

    expandedByPath.value = {
      ...expandedByPath.value,
      [relativePath]: !currentlyExpanded
    }

    if (currentlyExpanded) {
      return
    }

    if (!hasLoadedChildren(relativePath)) {
      await loadChildren(relativePath)
    }
  }

  function setActiveTab(relativePath: string): void {
    const hasMatch = openTabs.value.some((tab) => tab.relativePath === relativePath)
    if (!hasMatch) return

    activeTabPath.value = relativePath
    selectedPath.value = relativePath
  }

  function closeTabsByPrefix(prefixPath: string, fromExternalDelete = false): void {
    const beforeTabs = openTabs.value
    const nextTabs = beforeTabs.filter((tab) => !startsWithPathPrefix(tab.relativePath, prefixPath))

    if (nextTabs.length === beforeTabs.length) {
      return
    }

    openTabs.value = nextTabs

    if (fromExternalDelete) {
      setError(`File removed externally: ${prefixPath}`)
    }

    if (!activeTabPath.value) return

    if (!startsWithPathPrefix(activeTabPath.value, prefixPath)) {
      return
    }

    const fallbackTab = nextTabs[nextTabs.length - 1] ?? null
    activeTabPath.value = fallbackTab?.relativePath ?? null
  }

  async function openFile(relativePath: string): Promise<void> {
    selectedPath.value = relativePath

    const existingTab = openTabs.value.find((tab) => tab.relativePath === relativePath)
    if (existingTab) {
      activeTabPath.value = existingTab.relativePath
      return
    }

    try {
      const fileData = await workspaceClient.readFile(relativePath)
      const nextTab: WorkspaceTab = {
        relativePath: fileData.relativePath,
        title: fileData.name,
        content: fileData.content,
        savedContent: fileData.content,
        mtimeMs: fileData.mtimeMs,
        isDirty: false,
        isBinary: false,
        binaryMessage: null
      }

      openTabs.value = [...openTabs.value, nextTab]
      activeTabPath.value = nextTab.relativePath
      clearError()
    } catch (error) {
      if (error instanceof WorkspaceClientError && error.code === 'BINARY_FILE') {
        const nextTab: WorkspaceTab = {
          relativePath,
          title: getBaseName(relativePath),
          content: '',
          savedContent: '',
          mtimeMs: 0,
          isDirty: false,
          isBinary: true,
          binaryMessage: error.message
        }

        openTabs.value = [...openTabs.value, nextTab]
        activeTabPath.value = nextTab.relativePath
        return
      }

      setError(toErrorMessage(error, 'Failed to open the selected file.'))
    }
  }

  function closeTab(relativePath: string): void {
    const currentIndex = openTabs.value.findIndex((tab) => tab.relativePath === relativePath)
    if (currentIndex < 0) return

    const nextTabs = openTabs.value.filter((tab) => tab.relativePath !== relativePath)
    openTabs.value = nextTabs

    if (activeTabPath.value !== relativePath) return

    const candidate = nextTabs[currentIndex] ?? nextTabs[currentIndex - 1] ?? null
    activeTabPath.value = candidate?.relativePath ?? null
  }

  function moveTab(relativePath: string, targetPath: string, insertAfter: boolean): void {
    if (relativePath === targetPath) return

    const fromIndex = openTabs.value.findIndex((tab) => tab.relativePath === relativePath)
    const targetIndex = openTabs.value.findIndex((tab) => tab.relativePath === targetPath)

    if (fromIndex < 0 || targetIndex < 0) return

    const nextTabs = [...openTabs.value]
    const [movingTab] = nextTabs.splice(fromIndex, 1)

    if (!movingTab) return

    let insertionIndex = targetIndex

    if (fromIndex < targetIndex) {
      insertionIndex -= 1
    }

    if (insertAfter) {
      insertionIndex += 1
    }

    insertionIndex = Math.max(0, Math.min(insertionIndex, nextTabs.length))
    nextTabs.splice(insertionIndex, 0, movingTab)
    openTabs.value = nextTabs
  }

  function updateActiveTabContent(nextContent: string): void {
    if (!activeTabPath.value) return

    openTabs.value = openTabs.value.map((tab) => {
      if (tab.relativePath !== activeTabPath.value || tab.isBinary) {
        return tab
      }

      return {
        ...tab,
        content: nextContent,
        isDirty: nextContent !== tab.savedContent
      }
    })
  }

  async function reloadOpenTabFromDisk(relativePath: string): Promise<void> {
    const targetTab = openTabs.value.find((tab) => tab.relativePath === relativePath)
    if (!targetTab || targetTab.isDirty || targetTab.isBinary) return

    try {
      const fileData = await workspaceClient.readFile(relativePath)

      openTabs.value = openTabs.value.map((tab) => {
        if (tab.relativePath !== relativePath) {
          return tab
        }

        return {
          ...tab,
          title: fileData.name,
          content: fileData.content,
          savedContent: fileData.content,
          mtimeMs: fileData.mtimeMs,
          isDirty: false,
          isBinary: false,
          binaryMessage: null
        }
      })
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to reload file after external update.'))
    }
  }

  async function saveTab(relativePath: string): Promise<boolean> {
    const tab = openTabs.value.find((item) => item.relativePath === relativePath)

    if (!tab || tab.isBinary) {
      return false
    }

    if (!tab.isDirty) {
      return true
    }

    try {
      const writeResult = await workspaceClient.writeFile({
        relativePath: tab.relativePath,
        content: tab.content,
        expectedMtimeMs: tab.mtimeMs
      })

      if (!writeResult.ok) {
        setError(`[CONFLICT] ${tab.relativePath} changed on disk. Reload before saving.`)
        return false
      }

      openTabs.value = openTabs.value.map((item) => {
        if (item.relativePath !== tab.relativePath) {
          return item
        }

        return {
          ...item,
          savedContent: item.content,
          mtimeMs: writeResult.mtimeMs,
          isDirty: false
        }
      })

      clearError()
      return true
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to save file.'))
      return false
    }
  }

  async function saveActiveTab(): Promise<void> {
    if (!activeTabPath.value) {
      return
    }

    await saveTab(activeTabPath.value)
  }

  async function createEntry(
    parentRelativePath: string | null,
    name: string,
    kind: WorkspaceEntryKind
  ): Promise<void> {
    try {
      const created = await workspaceClient.createEntry({
        parentRelativePath,
        name,
        kind
      })

      await refreshLoadedTree()
      clearError()

      if (created.kind === 'file') {
        await openFile(created.relativePath)
      }
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to create workspace entry.'))
    }
  }

  async function createEntryByRelativePath(
    targetRelativePath: string,
    kind: WorkspaceEntryKind
  ): Promise<void> {
    const normalized = normalizeRelativeInput(targetRelativePath)

    if (!normalized) {
      setError('Target path cannot be empty.')
      return
    }

    const parentRelativePath = getParentPath(normalized)
    const entryName = getBaseName(normalized)

    await createEntry(parentRelativePath, entryName, kind)
  }

  async function renameEntry(relativePath: string, nextName: string): Promise<boolean> {
    try {
      const result = await workspaceClient.renameEntry({
        relativePath,
        nextName
      })

      openTabs.value = openTabs.value.map((tab) => {
        if (!startsWithPathPrefix(tab.relativePath, result.fromPath)) {
          return tab
        }

        const tail = tab.relativePath.slice(result.fromPath.length)
        const nextRelativePath = `${result.toPath}${tail}`

        return {
          ...tab,
          relativePath: nextRelativePath,
          title: getBaseName(nextRelativePath)
        }
      })

      if (activeTabPath.value && startsWithPathPrefix(activeTabPath.value, result.fromPath)) {
        const tail = activeTabPath.value.slice(result.fromPath.length)
        activeTabPath.value = `${result.toPath}${tail}`
      }

      if (selectedPath.value && startsWithPathPrefix(selectedPath.value, result.fromPath)) {
        const tail = selectedPath.value.slice(result.fromPath.length)
        selectedPath.value = `${result.toPath}${tail}`
      }

      await refreshLoadedTree()
      stopRename()
      clearError()
      return true
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to rename workspace entry.'))
      return false
    }
  }

  async function deleteEntry(relativePath: string): Promise<void> {
    try {
      await workspaceClient.deleteEntry({
        relativePath,
        recursive: true
      })

      closeTabsByPrefix(relativePath)

      if (selectedPath.value && startsWithPathPrefix(selectedPath.value, relativePath)) {
        selectedPath.value = null
      }
      if (renamingPath.value && startsWithPathPrefix(renamingPath.value, relativePath)) {
        renamingPath.value = null
      }

      await refreshLoadedTree()
      clearError()
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to delete workspace entry.'))
    }
  }

  async function revealInOs(relativePath: string): Promise<void> {
    try {
      await workspaceClient.revealInOs({
        relativePath
      })
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to reveal entry in OS file manager.'))
    }
  }

  async function handleFsChange(eventPayload: WorkspaceFsEventDTO): Promise<void> {
    const parentRelativePath = getParentPath(eventPayload.relativePath)

    if (eventPayload.eventType === 'unlink' || eventPayload.eventType === 'unlinkDir') {
      closeTabsByPrefix(eventPayload.relativePath, true)

      if (
        selectedPath.value &&
        startsWithPathPrefix(selectedPath.value, eventPayload.relativePath)
      ) {
        selectedPath.value = null
      }
      if (
        renamingPath.value &&
        startsWithPathPrefix(renamingPath.value, eventPayload.relativePath)
      ) {
        renamingPath.value = null
      }

      if (eventPayload.eventType === 'unlinkDir') {
        const nextExpandedMap = { ...expandedByPath.value }

        for (const key of Object.keys(nextExpandedMap)) {
          if (startsWithPathPrefix(key, eventPayload.relativePath)) {
            delete nextExpandedMap[key]
          }
        }

        expandedByPath.value = nextExpandedMap
      }
    }

    if (eventPayload.eventType === 'change') {
      const changedTab = openTabs.value.find(
        (tab) => tab.relativePath === eventPayload.relativePath
      )
      if (changedTab?.isDirty) {
        setError(`[CONFLICT] ${eventPayload.relativePath} changed externally.`)
      } else if (changedTab) {
        await reloadOpenTabFromDisk(eventPayload.relativePath)
      }
    }

    const parentKey = toParentKey(parentRelativePath)
    if (Object.prototype.hasOwnProperty.call(childrenByParent.value, parentKey)) {
      await loadChildren(parentRelativePath)
    }
  }

  async function startWatch(): Promise<void> {
    if (!hasWorkspace.value) return

    if (!fsEventDisposer) {
      fsEventDisposer = workspaceClient.onFsChanged((eventPayload) => {
        void handleFsChange(eventPayload)
      })
    }

    try {
      const state = await workspaceClient.watchStart()
      isWatching.value = state.watching
    } catch (error) {
      setError(toErrorMessage(error, 'Failed to start workspace watcher.'))
    }
  }

  async function stopWatch(): Promise<void> {
    try {
      await workspaceClient.watchStop()
    } catch {
      // ignore stop errors while tearing down
    }

    isWatching.value = false

    if (fsEventDisposer) {
      fsEventDisposer()
      fsEventDisposer = null
    }
  }

  async function disposeStoreResources(): Promise<void> {
    await stopWatch()
  }

  return {
    rootPath,
    rootNodes,
    hasWorkspace,
    openTabs,
    activeTabPath,
    activeTab,
    selectedPath,
    renamingPath,
    lastError,
    isWatching,
    getChildren,
    isExpanded,
    isParentLoading,
    setSelectedPath,
    startRename,
    stopRename,
    clearError,
    initializeWorkspace,
    refreshWorkspaceState,
    refreshLoadedTree,
    pickWorkspace,
    toggleDirectory,
    openFile,
    closeTab,
    moveTab,
    setActiveTab,
    updateActiveTabContent,
    saveTab,
    saveActiveTab,
    createEntry,
    createEntryByRelativePath,
    renameEntry,
    deleteEntry,
    revealInOs,
    startWatch,
    stopWatch,
    disposeStoreResources,
    findNode
  }
})
