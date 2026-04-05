# CLAUDE.md — Electron Plugin App

Konteks proyek ini untuk AI assistant (Claude Code, Cursor, Copilot, dll).
Baca file ini sebelum membuat perubahan apapun.

---

## Deskripsi proyek

Aplikasi desktop berbasis **Electron + React** dengan arsitektur **plugin system**.
Plugin dapat ditambah/dihapus/reload tanpa rebuild atau restart core app.
App juga mendukung komunikasi langsung ke hardware (serial port, USB HID, Bluetooth).

**Stack:**
- Main process: Node.js (Electron)
- Renderer: React 18 + Vite
- State management: Zustand
- Persistence: electron-store (per plugin, isolated)
- Device: serialport, node-hid, @abandonware/noble (semua optional)

---

## Struktur folder

```
electron-plugin-app/
├── src/
│   ├── main/                      # Electron main process (Node.js penuh)
│   │   ├── main.js                # Entry point, bootstrap app
│   │   ├── plugin-manager.js      # Load/unload/reload plugin
│   │   ├── core-api.js            # Sandboxed API yang diberikan ke plugin
│   │   ├── ipc-handlers.js        # Semua ipcMain.handle untuk channel core:*
│   │   ├── preload.js             # contextBridge — satu-satunya jembatan ke renderer
│   │   └── device/
│   │       ├── serial-adapter.js  # Wrapper serialport
│   │       └── hid-adapter.js     # Wrapper node-hid
│   └── renderer/                  # React app (browser context, tanpa Node.js)
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Root layout: sidebar + panel area
│       ├── hooks/
│       │   └── use-plugin.js      # usePlugin(), usePluginEvent()
│       └── stores/
│           └── plugin-store.js    # Zustand store: plugins[], panels[], errors[]
├── plugins/                       # Plugin bundled bawaan app
│   └── serial-monitor/
│       ├── manifest.json
│       └── main.js
└── package.json
```

Plugin yang diinstall user disimpan di:
`{userData}/plugins/{plugin-id}/` — diakses via `app.getPath('userData')`

---

## Konsep utama yang harus dipahami

### 1. Dua proses Electron

| | Main process | Renderer process |
|---|---|---|
| Runtime | Node.js penuh | Browser (Chromium) |
| Akses filesystem | Ya | Tidak langsung |
| Akses device | Ya | Tidak |
| Komunikasi | ipcMain | ipcRenderer via preload |

**Jangan pernah** menaruh logika Node.js/device di renderer.
**Jangan pernah** mengekspos `require` atau `ipcRenderer` langsung ke renderer — selalu lewat `contextBridge` di `preload.js`.

### 2. Plugin system

Setiap plugin adalah folder dengan:
```
plugin-id/
├── manifest.json   # Metadata + permissions
└── main.js         # Export activate(coreAPI) dan opsional deactivate()
```

Plugin di-`require()` oleh `PluginManager` di main process.
Plugin **tidak** punya akses ke Electron API secara langsung — hanya lewat `coreAPI` yang disandbox.

**Lifecycle plugin:**
```
loadPlugin(path)
  → baca manifest.json
  → validasi (id, name, version wajib ada)
  → require(main.js)
  → plugin.activate(coreAPI)    ← plugin mendaftarkan handler di sini
  → status: active

unloadPlugin(id)
  → plugin.deactivate()         ← cleanup resource
  → hapus semua ipcMain.handle milik plugin
  → delete require.cache        ← penting untuk hot-reload
  → status: removed
```

### 3. Core API (sandboxed)

`coreAPI` yang diterima plugin berisi:

```js
{
  pluginId,           // string, id dari manifest
  store,              // electron-store, scoped ke plugin ini
  events: {
    on(event, fn),    // subscribe event app-wide
    off(event, fn),
    emit(event, data) // emit dengan prefix plugin:pluginId:event
  },
  ipc: {
    handle(channel, fn),  // daftarkan handler, prefix otomatis: plugin:pluginId:channel
    send(channel, data),  // push event ke renderer
  },
  ui: {
    registerPanel(def),   // daftarkan panel di sidebar renderer
  },
  device,   // serial-adapter jika permission 'serial' ada, else null
  hid,      // hid-adapter jika permission 'hid' ada, else null
  app: { getVersion(), getPath(name) },
  log: { info(), warn(), error() },
}
```

Plugin **tidak boleh** meng-import `electron` sendiri.
Plugin **tidak boleh** membaca file di luar direktori plugin-nya tanpa permission eksplisit.

### 4. IPC channel naming convention

```
core:{resource}:{action}     # Dihandle oleh core app
  core:plugins:list
  core:plugins:load
  core:plugins:unload
  core:plugins:reload
  core:panels:list

plugin:{pluginId}:{channel}  # Dihandle oleh plugin
  plugin:serial-monitor:list-ports
  plugin:serial-monitor:open-port
  plugin:serial-monitor:send
```

Di renderer, panggil plugin lewat:
```js
window.electronAPI.pluginCall('serial-monitor', 'list-ports')
// atau lewat hook:
const { call } = usePlugin('serial-monitor')
await call('list-ports')
```

### 5. Renderer ↔ Plugin communication

```
Renderer (React)
  └─ window.electronAPI.pluginCall(pluginId, channel, data)   [invoke]
  └─ window.electronAPI.pluginOn(pluginId, channel, fn)       [subscribe push]
       ↕ contextBridge (preload.js)
Main process
  └─ ipcMain.handle(`plugin:${pluginId}:${channel}`, handler) [registered by plugin]
  └─ win.webContents.send(`plugin:${pluginId}:${channel}`)    [push ke renderer]
       ↕ coreAPI.ipc
Plugin (main.js)
  └─ coreAPI.ipc.handle(channel, fn)
  └─ coreAPI.ipc.send(channel, data)
```

---

## Aturan saat mengedit kode

### Yang BOLEH dilakukan
- Tambah plugin baru di `plugins/` atau `{userData}/plugins/`
- Tambah method baru di `core-api.js` (expose ke semua plugin)
- Tambah IPC channel baru di `ipc-handlers.js` (untuk fitur core)
- Tambah device adapter baru di `src/main/device/`
- Tambah React component baru di `src/renderer/`

### Yang TIDAK BOLEH dilakukan
- `nodeIntegration: true` di BrowserWindow — security risk
- Import `electron` di file renderer (`src/renderer/**`)
- Import `electron` di plugin (`plugins/**`) — selalu lewat coreAPI
- Taruh secret/credentials hardcoded di plugin
- Gunakan `eval()` atau `new Function()` di plugin
- Akses `require.cache` di luar `plugin-manager.js`

### Saat menambah fitur ke coreAPI
1. Tambah method di `core-api.js` → `createForPlugin()`
2. Kalau butuh permission: cek `permissions.includes('nama-permission')` sebelum expose
3. Tambah cleanup di `cleanupPlugin()` jika fitur membuka resource
4. Update manifest schema di komentar `_validateManifest()`
5. Update CLAUDE.md bagian Core API di atas

### Saat membuat plugin baru
1. Buat folder `plugins/{plugin-id}/`
2. Buat `manifest.json` (id lowercase-dash, wajib: id, name, version)
3. Buat `main.js` dengan export `activate(coreAPI)` dan `deactivate()`
4. Semua IPC handler didaftarkan di dalam `activate()`
5. Semua resource (port, connection) dibersihkan di `deactivate()`

---

## manifest.json schema

```json
{
  "id": "plugin-id",           // required, lowercase + dash only
  "name": "Plugin Name",       // required, display name
  "version": "1.0.0",          // required, semver
  "description": "...",        // optional
  "main": "main.js",           // optional, default: main.js
  "permissions": [             // optional, default: []
    "serial",                  // akses serial-adapter
    "hid",                     // akses hid-adapter
    "storage"                  // izin eksplisit pakai store (selalu bisa, ini dokumentasi)
  ],
  "panel": {                   // optional, jika plugin punya UI
    "title": "Panel Title",
    "icon": "terminal",
    "position": "sidebar"
  }
}
```

---

## Device communication

Device hanya bisa diakses dari **main process**.
Plugin menerima adapter via `coreAPI.device` (serial) atau `coreAPI.hid`.

**Serial port:**
```js
// Di plugin activate()
const ports = await api.device.list()           // [{path, manufacturer, ...}]
await api.device.open('/dev/ttyUSB0', 9600)
api.device.onData('/dev/ttyUSB0', (data) => {})
await api.device.write('/dev/ttyUSB0', 'hello\n')
api.device.close('/dev/ttyUSB0')
```

**HID:**
```js
const devices = api.hid.list()                 // [{vendorId, productId, ...}]
api.hid.write(0x1234, 0x5678, [0x00, 0x01])
api.hid.onData(0x1234, 0x5678, (data) => {})
```

Semua device dibersihkan otomatis saat `cleanupPlugin()` dipanggil
**hanya jika** plugin memanggil `close()` di `deactivate()`.
Adapter tidak auto-close — plugin bertanggung jawab cleanup resource sendiri.

---

## Cara run & build

```bash
# Development
npm run dev          # jalankan Vite dev server + Electron bersamaan

# Build production
npm run build        # build renderer ke dist/ lalu package dengan electron-builder

# Install plugin manual (development)
# Taruh folder plugin di:
# macOS/Linux: ~/Library/Application Support/{appName}/plugins/
# Windows:     %APPDATA%\{appName}\plugins\
```

---

## Hal yang belum diimplementasi (TODO)

- [ ] Permission dialog saat plugin minta akses device pertama kali
- [ ] Plugin signature verification (keamanan plugin dari luar)
- [ ] Bluetooth adapter (`@abandonware/noble`)
- [ ] Plugin marketplace / registry endpoint
- [ ] Plugin panel dengan BrowserWindow terpisah (untuk plugin dengan UI kompleks)
- [ ] Inter-plugin communication (plugin A memanggil event plugin B)
- [ ] Plugin dependency resolution (plugin B butuh plugin A aktif dulu)
