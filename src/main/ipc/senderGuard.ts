import { BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { WorkspaceDomainError } from '../modules/workspace/workspaceTypes'

export function requireSenderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)

  if (!senderWindow || senderWindow.isDestroyed()) {
    throw new WorkspaceDomainError('PERMISSION_DENIED', 'Unable to identify sender window.')
  }

  return senderWindow
}
