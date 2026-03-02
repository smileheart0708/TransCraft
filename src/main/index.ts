import type { BrowserWindowConstructorOptions, TitleBarOverlay } from 'electron'
import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

type TitleBarWindowState = {
  isMaximized: boolean
  isFullScreen: boolean
  isFocused: boolean
}

type ThemePreference = 'auto' | 'light' | 'dark'
type ResolvedTheme = Exclude<ThemePreference, 'auto'>
type OverlayThemePalette = {
  activeColor: string
  inactiveColor: string
  activeSymbolColor: string
  inactiveSymbolColor: string
  height: number
}

const IS_MAC = process.platform === 'darwin'
const SUPPORTS_TITLEBAR_OVERLAY = process.platform === 'win32' || process.platform === 'linux'

const OVERLAY_THEMES = {
  dark: {
    activeColor: '#1e1d1b',
    inactiveColor: '#171615',
    activeSymbolColor: '#eeebe6',
    inactiveSymbolColor: '#ada79d',
    height: 36
  },
  light: {
    activeColor: '#f5f4f0',
    inactiveColor: '#efece6',
    activeSymbolColor: '#23211f',
    inactiveSymbolColor: '#5d5952',
    height: 36
  }
} satisfies Record<ResolvedTheme, OverlayThemePalette>

let themePreference: ThemePreference = 'auto'

function resolveOverlayTheme(preference: ThemePreference, isFocused = true): TitleBarOverlay {
  const resolvedTheme: ResolvedTheme =
    preference === 'auto' ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') : preference

  const palette = OVERLAY_THEMES[resolvedTheme]

  return {
    color: isFocused ? palette.activeColor : palette.inactiveColor,
    symbolColor: isFocused ? palette.activeSymbolColor : palette.inactiveSymbolColor,
    height: palette.height
  }
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
}

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
  window.setTitleBarOverlay(resolveOverlayTheme(themePreference, window.isFocused()))
}

function updateAllTitleBarThemes(): void {
  if (!SUPPORTS_TITLEBAR_OVERLAY) return

  const allWindows = BrowserWindow.getAllWindows()
  allWindows.forEach((win) => updateTitleBarTheme(win))
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
  const windowOptions: BrowserWindowConstructorOptions = {
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    ...(SUPPORTS_TITLEBAR_OVERLAY ? { titleBarOverlay: resolveOverlayTheme(themePreference) } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }

  const mainWindow = new BrowserWindow(windowOptions)

  registerWindowStateBridge(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 基于 electron-vite 的渲染进程热更新
  // 开发环境加载远程 URL，生产环境加载本地 HTML 文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

nativeTheme.on('updated', () => {
  if (themePreference !== 'auto') return
  updateAllTitleBarThemes()
})

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
// 某些 API 只能在此事件发生后使用
app.whenReady().then(() => {
  // 为 Windows 设置应用用户模型 ID
  electronApp.setAppUserModelId('com.electron')

  // 开发环境下默认使用 F12 打开或关闭 DevTools
  // 生产环境下忽略 CommandOrControl + R 刷新快捷键
  // 参考: https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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

  ipcMain.handle('theme:set-preference', (_event, preference: unknown) => {
    if (!isThemePreference(preference)) return
    themePreference = preference
    updateAllTitleBarThemes()
  })

  createWindow()

  app.on('activate', function () {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时
    // 通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 当所有窗口关闭时退出应用，macOS 除外
// 在 macOS 上，应用程序及其菜单栏通常保持活动状态
// 直到用户使用 Cmd + Q 显式退出
app.on('window-all-closed', () => {
  if (!IS_MAC) {
    app.quit()
  }
})

// 在此文件中可以包含应用程序特定的主进程代码
// 也可以将它们放在单独的文件中并在此引入
