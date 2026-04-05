import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import PluginManager from './plugin-manager'
import CoreAPI from './core-api'
import { setupIPC } from './ipc-handlers'

// File logger — writes to project root/electron.log so errors are visible
const logFile = path.join(__dirname, '../../electron.log')
function log(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`
  process.stdout.write(line)
  fs.appendFileSync(logFile, line)
}
function logError(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ERROR: ${args.map(a => a instanceof Error ? a.stack : String(a)).join(' ')}\n`
  process.stderr.write(line)
  fs.appendFileSync(logFile, line)
}

// Clear log on each start
try { fs.writeFileSync(logFile, `--- Electron started at ${new Date().toISOString()} ---\n`) } catch {}

let mainWindow: BrowserWindow | undefined
let pluginManager: InstanceType<typeof PluginManager>
let coreAPI: InstanceType<typeof CoreAPI>

async function createWindow(): Promise<void> {
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
  ipcMain.on('window:minimize', () => mainWindow!.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow!.isMaximized()) mainWindow!.restore()
    else mainWindow!.maximize()
  })
  ipcMain.on('window:close', () => mainWindow!.close())

  mainWindow.on('maximize', () => mainWindow!.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow!.webContents.send('window:maximized', false))

  mainWindow.once('ready-to-show', () => mainWindow!.show())

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:6173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

async function bootstrap(): Promise<void> {
  try {
    log('Bootstrap starting...')
    await app.whenReady()
    log('App ready, version:', app.getVersion())

    coreAPI = new CoreAPI({ mainWindow: () => mainWindow })
    log('CoreAPI initialized')

    pluginManager = new PluginManager(coreAPI)
    log('PluginManager initialized')

    setupIPC(ipcMain, pluginManager, coreAPI)
    log('IPC handlers set up')

    await createWindow()
    log('Window created')

    await pluginManager.loadAll()
    log('Plugins loaded')

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })

    app.on('before-quit', async () => {
      log('App quitting, unloading plugins...')
      await pluginManager.unloadAll()
    })

    log('Bootstrap complete')
  } catch (error) {
    logError(error)
    process.exit(1)
  }
}

void bootstrap()
