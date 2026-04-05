# Electron Plugin App — Build Checklist

## Phase 1 — Setup project

- [ ] Buat folder struktur: `src/main/`, `src/renderer/`, `plugins/`
- [ ] `npm init` + install `electron`, `electron-store`, `vite`, `concurrently`
- [ ] Salin `package.json` dari boilerplate (sudah disediakan)
- [ ] Buat `vite.config.js` untuk renderer (React + alias `@/`)
- [ ] Buat `.gitignore` (`node_modules`, `dist`, `plugin-stores`)

---

## Phase 2 — Main process core

- [ ] Salin `main.js` (app bootstrap, createWindow)
- [ ] Salin `plugin-manager.js` (loadAll, loadPlugin, unload, reload)
- [ ] Salin `core-api.js` (createForPlugin, cleanupPlugin)
- [ ] Salin `ipc-handlers.js` (setup semua `core:` channel)
- [ ] Salin `preload.js` (contextBridge expose `electronAPI`)
- [ ] **Test:** `electron .` — pastikan window muncul tanpa error

---

## Phase 3 — Renderer (React)

- [ ] Buat `src/renderer/index.html` + `main.jsx` (entry point)
- [ ] Salin `stores/plugin-store.js` (zustand)
- [ ] Salin `hooks/use-plugin.js` (`usePlugin`, `usePluginEvent`)
- [ ] Buat `App.jsx` dengan layout sidebar + main panel
- [ ] Buat `PluginManager` panel: list plugin, status badge, reload/unload button
- [ ] Panggil `usePluginStore().init()` di App mount
- [ ] **Test:** plugins list tampil di UI

---

## Phase 4 — Device adapters

- [ ] Salin `device/serial-adapter.js`
- [ ] Salin `device/hid-adapter.js`
- [ ] `npm install serialport` (optional, cek error graceful jika tidak ada)
- [ ] **Test:** `serialport list()` di plugin tanpa crash jika port kosong

---

## Phase 5 — Plugin pertama (serial-monitor)

- [ ] Buat `plugins/serial-monitor/manifest.json`
- [ ] Salin `plugins/serial-monitor/main.js`
- [ ] Buat `renderer/panels/SerialMonitorPanel.jsx` — gunakan `usePlugin()`
- [ ] Daftarkan panel di `App.jsx` sesuai panels dari store
- [ ] **Test:** plugin load otomatis saat app start
- [ ] **Test:** UI panel muncul di sidebar setelah `activate()`

---

## Phase 6 — Plugin dev workflow

- [ ] Tambah tombol "Install plugin" (pilih folder via dialog)
- [ ] Implement hot-reload plugin via reload button di PluginManager UI
- [ ] Buat contoh plugin kedua (misal: `app-info` atau `system-stats`)
- [ ] **Test:** reload tanpa restart app

---

## Phase 7 — Polish & build

- [ ] Tambah error boundary di React untuk plugin panel crash
- [ ] Pastikan `deactivate()` cleanup berjalan saat unload
- [ ] `npm run build` — pastikan electron-builder berhasil
- [ ] **Test:** instalasi dari `dist/` di mesin bersih
- [ ] Dokumentasi: cara buat plugin baru (manifest + activate/deactivate)
