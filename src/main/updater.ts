import updater from 'electron-updater'
import { dialog } from 'electron'
import { is } from '@electron-toolkit/utils'

const { autoUpdater } = updater

// 配置自动更新器
export function setupAutoUpdater(): void {
  // 开发环境不启用自动更新
  if (is.dev) {
    console.log('[Updater] 开发环境，跳过自动更新检查')
    return
  }

  // 配置更新日志
  autoUpdater.logger = console
  autoUpdater.autoDownload = false // 不自动下载，让用户选择
  autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

  // 检查更新时触发
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] 正在检查更新...')
  })

  // 发现新版本时触发
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 发现新版本:', info.version)

    dialog
      .showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${info.version}，是否立即下载？`,
        detail: info.releaseNotes as string | undefined,
        buttons: ['立即下载', '稍后提醒'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  // 当前已是最新版本时触发
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 当前已是最新版本:', info.version)
  })

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `下载速度: ${progressObj.bytesPerSecond} - 已下载 ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    console.log('[Updater]', logMessage)
  })

  // 下载完成时触发
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 更新下载完成:', info.version)

    dialog
      .showMessageBox({
        type: 'info',
        title: '更新已就绪',
        message: '新版本已下载完成，是否立即重启应用进行更新？',
        buttons: ['立即重启', '稍后重启'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  // 更新错误时触发
  autoUpdater.on('error', (error) => {
    console.error('[Updater] 更新错误:', error)
    dialog.showMessageBox({
      type: 'error',
      title: '更新失败',
      message: '检查更新时发生错误',
      detail: error.message
    })
  })

  // 应用启动后延迟 3 秒检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdates()
  }, 3000)
}

// 手动检查更新（可通过菜单或按钮触发）
export function checkForUpdates(): void {
  if (is.dev) {
    dialog.showMessageBox({
      type: 'info',
      title: '开发环境',
      message: '开发环境下无法检查更新'
    })
    return
  }

  autoUpdater.checkForUpdates()
}
