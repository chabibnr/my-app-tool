const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron')
const path = require('path')
const PluginManager = require('./plugin-manager')
const CoreAPI = require('./core-api')
const { setupIPC } = require('./ipc-handlers')

let mainWindow
let tray
let pluginManager
let coreAPI

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    show: false,
  })

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.restore()
    else mainWindow.maximize()
  })
  ipcMain.on('window:close', () => mainWindow.close())

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false))

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:6173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

async function bootstrap() {
  await app.whenReady()

  coreAPI = new CoreAPI({ mainWindow: () => mainWindow })
  pluginManager = new PluginManager(coreAPI)

  setupIPC(ipcMain, pluginManager, coreAPI)

  await createWindow()
  await pluginManager.loadAll()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await pluginManager.unloadAll()
})

bootstrap().catch(console.error)
