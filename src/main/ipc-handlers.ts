import { dialog, BrowserWindow, IpcMain } from 'electron'
import type CoreAPI from './core-api'
import type PluginManager from './plugin-manager'

export function setupIPC(
  ipcMain: IpcMain,
  pluginManager: InstanceType<typeof PluginManager>,
  coreAPI: InstanceType<typeof CoreAPI>,
): void {
  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('core:plugins:list', () => pluginManager.getAll())

  ipcMain.handle('core:plugins:load', async (_event, pluginPath: string) => {
    return pluginManager.loadPlugin(pluginPath)
  })

  ipcMain.handle('core:plugins:unload', async (_event, pluginId: string) => {
    await pluginManager.unloadPlugin(pluginId)
    return { ok: true }
  })

  ipcMain.handle('core:plugins:reload', async (_event, pluginId: string) => {
    await pluginManager.reloadPlugin(pluginId)
    return { ok: true }
  })

  ipcMain.handle('core:panels:list', () => coreAPI.getPanels())

  pluginManager.on('plugin:activated', (manifest: unknown) => {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:activated', manifest))
  })

  pluginManager.on('plugin:deactivated', (data: unknown) => {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:deactivated', data))
  })

  pluginManager.on('plugin:error', (data: unknown) => {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:error', data))
  })
}
