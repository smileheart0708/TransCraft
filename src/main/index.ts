import type { BrowserWindowConstructorOptions } from 'electron'
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import windowStateKeeper from 'electron-window-state'
import icon from '../../resources/icon.png?asset'
import { setupAutoUpdater, checkForUpdates } from './updater'
import { ThemeService, isThemePreference } from './modules/theme/themeService'
import { registerWorkspaceIpc } from './modules/workspace/workspaceIpc'

type TitleBarWindowState = {
  isMaximized: boolean
  isFullScreen: boolean
  isFocused: boolean
}

const IS_MAC = process.platform === 'darwin'
const SUPPORTS_TITLEBAR_OVERLAY = process.platform === 'win32' || process.platform === 'linux'
const themeService = new ThemeService()

function getWindowState(window: BrowserWindow): TitleBarWindowState {
  return {
    isMaximized: window.isMaximized(),
    isFullScreen: window.isFullScreen(),
    isFocused: window.isFocused()
  }
}

function publishWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  window.webContents.send('titlebar:state-changed', getWindowState(window))
}

function updateTitleBarTheme(window: BrowserWindow): void {
  if (!SUPPORTS_TITLEBAR_OVERLAY || window.isDestroyed()) return
  window.setTitleBarOverlay(themeService.resolveOverlayTheme(window.isFocused()))
}

function updateWindowBackground(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  window.setBackgroundColor(themeService.getWindowBackgroundColor())
}

function updateAllWindowAppearance(): void {
  const allWindows = BrowserWindow.getAllWindows()
  allWindows.forEach((win) => {
    updateTitleBarTheme(win)
    updateWindowBackground(win)
  })
}

function registerWindowStateBridge(window: BrowserWindow): void {
  window.on('maximize', () => publishWindowState(window))
  window.on('unmaximize', () => publishWindowState(window))
  window.on('enter-full-screen', () => publishWindowState(window))
  window.on('leave-full-screen', () => publishWindowState(window))
  window.on('focus', () => {
    updateTitleBarTheme(window)
    publishWindowState(window)
  })
  window.on('blur', () => {
    updateTitleBarTheme(window)
    publishWindowState(window)
  })
  window.webContents.on('did-finish-load', () => {
    updateTitleBarTheme(window)
    publishWindowState(window)
  })
}

function createWindow(): void {
  const windowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 760
  })

  const windowOptions: BrowserWindowConstructorOptions = {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: themeService.getWindowBackgroundColor(),
    titleBarStyle: 'hidden',
    ...(SUPPORTS_TITLEBAR_OVERLAY ? { titleBarOverlay: themeService.resolveOverlayTheme() } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  }

  const mainWindow = new BrowserWindow(windowOptions)
  windowState.manage(mainWindow)

  registerWindowStateBridge(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

nativeTheme.on('updated', () => {
  if (!themeService.isFollowingSystem()) return
  updateAllWindowAppearance()
})

let disposeWorkspaceIpc: (() => Promise<void>) | null = null

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const workspaceIpcRegistration = registerWorkspaceIpc()
  disposeWorkspaceIpc = workspaceIpcRegistration.dispose

  ipcMain.removeHandler('titlebar:get-state')
  ipcMain.handle('titlebar:get-state', (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender)
    if (!targetWindow) {
      return {
        isMaximized: false,
        isFullScreen: false,
        isFocused: false
      } satisfies TitleBarWindowState
    }

    return getWindowState(targetWindow)
  })

  ipcMain.removeHandler('theme:set-preference')
  ipcMain.handle('theme:set-preference', (_event, preference: unknown) => {
    if (!isThemePreference(preference)) return
    themeService.setPreference(preference)
    updateAllWindowAppearance()
  })

  ipcMain.removeHandler('theme:get-preference')
  ipcMain.handle('theme:get-preference', () => themeService.getPreference())

  ipcMain.removeHandler('updater:check-for-updates')
  ipcMain.handle('updater:check-for-updates', () => {
    checkForUpdates()
  })

  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  if (!disposeWorkspaceIpc) return
  void disposeWorkspaceIpc().catch((error) => {
    console.error('[workspace] failed to dispose workspace IPC during quit', error)
  })
})

app.on('window-all-closed', () => {
  if (!IS_MAC) {
    app.quit()
  }
})
