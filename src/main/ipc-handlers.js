const { dialog } = require('electron')

function setupIPC(ipcMain, pluginManager, coreAPI) {
  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('core:plugins:list', () => pluginManager.getAll())

  ipcMain.handle('core:plugins:load', async (_, pluginPath) => {
    return pluginManager.loadPlugin(pluginPath)
  })

  ipcMain.handle('core:plugins:unload', async (_, pluginId) => {
    await pluginManager.unloadPlugin(pluginId)
    return { ok: true }
  })

  ipcMain.handle('core:plugins:reload', async (_, pluginId) => {
    await pluginManager.reloadPlugin(pluginId)
    return { ok: true }
  })

  ipcMain.handle('core:panels:list', () => coreAPI.getPanels())

  pluginManager.on('plugin:activated', (manifest) => {
    const wins = require('electron').BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:activated', manifest))
  })

  pluginManager.on('plugin:deactivated', (data) => {
    const wins = require('electron').BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:deactivated', data))
  })

  pluginManager.on('plugin:error', (data) => {
    const wins = require('electron').BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('core:plugin:error', data))
  })
}

module.exports = { setupIPC }
