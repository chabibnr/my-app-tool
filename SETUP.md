# Setup & Initialization Guide

## ✅ Project Status

Your Electron Plugin App is **fully initialized and ready to run**!

All core files are in place:
- ✅ Main process (Electron backend)
- ✅ Renderer process (React frontend)
- ✅ Plugin system with hot-reload
- ✅ Device adapters (Serial, HID)
- ✅ Sample plugins (serial-monitor, ssh-terminal)
- ✅ Modern UI with Tailwind CSS

---

## 🚀 Quick Start

### 1. Install Dependencies (if not done)
```bash
npm install
```

### 2. Run the App
```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:6173
- Launch Electron with hot-reload enabled
- Load all plugins from the `plugins/` directory

---

## 📁 Project Structure

```
electron-plugin-app/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.js              # App entry point
│   │   ├── plugin-manager.js    # Plugin lifecycle management
│   │   ├── core-api.js          # Plugin API facade
│   │   ├── ipc-handlers.js      # IPC channel setup
│   │   ├── preload.js           # Context bridge
│   │   └── device/              # Device adapters
│   │       ├── serial-adapter.js
│   │       └── hid-adapter.js
│   └── renderer/                # React UI
│       ├── App.jsx              # Main app component
│       ├── main.jsx             # React entry point
│       ├── index.html           # HTML template
│       ├── App.css              # Tailwind config
│       ├── components/
│       │   └── Titlebar.jsx
│       ├── hooks/
│       │   └── use-plugin.js
│       ├── pages/
│       │   ├── PluginsPage.jsx
│       │   └── SshTerminalPage.jsx
│       ├── stores/
│       │   └── plugin-store.js
│       └── lib/
│           └── utils.js
├── plugins/                     # Plugin directory
│   ├── serial-monitor/
│   │   ├── manifest.json
│   │   └── main.js
│   └── ssh-terminal/
│       ├── manifest.json
│       ├── main.js
│       └── package.json
├── package.json
├── vite.config.mjs
├── .gitignore
├── README.md
└── SETUP.md (this file)
```

---

## 🔌 Included Plugins

### 1. Serial Monitor
- **ID**: `serial-monitor`
- **Features**: List ports, open/close connections, send/receive data
- **Permissions**: `serial`, `storage`
- **Status**: ✅ Ready to use

### 2. SSH Terminal
- **ID**: `ssh-terminal`
- **Features**: Multi-session SSH with xterm.js, password & key auth
- **Permissions**: None (uses Node.js ssh2)
- **Status**: ✅ Ready to use (requires `npm install` in plugin folder)

---

## 🛠️ Development Workflow

### Running the App
```bash
# Development mode (hot-reload enabled)
npm run dev

# Build for production
npm run build
```

### Plugin Development

#### Creating a New Plugin
1. Create a folder in `plugins/my-plugin/`
2. Add `manifest.json`:
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What your plugin does",
  "main": "main.js",
  "permissions": ["serial", "hid", "storage"],
  "panel": {
    "title": "My Panel",
    "icon": "terminal",
    "position": "sidebar"
  }
}
```

3. Add `main.js`:
```javascript
exports.activate = async (coreAPI) => {
  coreAPI.log.info('Plugin activated!');

  // Register a UI panel
  coreAPI.ui.registerPanel({
    title: 'My Panel',
    icon: 'terminal',
    componentId: 'MyPanel',
  });

  // Register IPC handlers
  coreAPI.ipc.handle('my-action', async (event, data) => {
    return { success: true, data };
  });

  // Access device (if permission granted)
  if (coreAPI.device) {
    const ports = await coreAPI.device.list();
    coreAPI.log.info('Available ports:', ports);
  }
};

exports.deactivate = async () => {
  // Cleanup code here
};
```

#### Hot-Reload a Plugin
- Use the reload button in the Plugin Manager UI
- Or call: `await window.electronAPI.plugins.reload('plugin-id')`

---

## 🎨 UI Development

### Using Plugin Hooks in React

```jsx
import { usePlugin } from '@/hooks/use-plugin';

function MyComponent() {
  const { call, on } = usePlugin('my-plugin');

  // Call plugin IPC handler
  const handleAction = async () => {
    const result = await call('my-action', { foo: 'bar' });
    console.log(result);
  };

  // Subscribe to plugin events
  useEffect(() => {
    const unsub = on('data', (data) => {
      console.log('Received:', data);
    });
    return unsub;
  }, []);

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Adding a Custom Page
1. Create component in `src/renderer/pages/MyPage.jsx`
2. Register in `App.jsx`:
```jsx
const PLUGIN_PAGES = {
  'my-plugin': MyPage,
};
```

---

## 📦 Dependencies

### Main Dependencies
- `electron` - Desktop app framework
- `electron-store` - Persistent key-value storage
- `react` & `react-dom` - UI framework
- `zustand` - State management
- `tailwindcss` - Styling
- `lucide-react` - Icons

### Optional Dependencies (Device Communication)
- `serialport` - Serial port communication
- `node-hid` - HID device communication
- `@abandonware/noble` - Bluetooth LE

### Dev Dependencies
- `vite` - Build tool & dev server
- `concurrently` - Run multiple commands
- `wait-on` - Wait for dev server
- `cross-env` - Cross-platform env vars
- `electron-builder` - Production builds

---

## 🐛 Troubleshooting

### Port 6173 already in use
```bash
# Kill process on port 6173 or change port in vite.config.mjs
```

### Plugin not loading
1. Check `manifest.json` format
2. Verify `main.js` exports `activate` function
3. Check console for errors in DevTools (Ctrl+Shift+I)

### Serial port not found
```bash
# Install serialport (optional dependency)
npm install serialport
```

### Module not found errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### SSH Terminal not working
```bash
# Install dependencies in plugin folder
cd plugins/ssh-terminal
npm install
```

---

## 📚 API Reference

### CoreAPI (available in plugins)

```javascript
coreAPI.pluginId              // Your plugin ID
coreAPI.store                 // electron-store instance
coreAPI.events.on(event, fn)  // Subscribe to events
coreAPI.events.emit(event, data) // Emit namespaced events
coreAPI.ipc.handle(channel, handler) // Register IPC handler
coreAPI.ipc.send(channel, data)      // Send to renderer
coreAPI.ui.registerPanel(panelDef)   // Register UI panel
coreAPI.device                // Serial adapter (if permitted)
coreAPI.hid                   // HID adapter (if permitted)
coreAPI.app.getVersion()      // App version
coreAPI.app.getPath(name)     // App paths
coreAPI.log.info/warn/error() // Scoped logging
```

### Window API (renderer)

```javascript
window.electronAPI.plugins.list()
window.electronAPI.plugins.load(path)
window.electronAPI.plugins.unload(id)
window.electronAPI.plugins.reload(id)
window.electronAPI.panels.list()
window.electronAPI.pluginCall(pluginId, channel, data)
window.electronAPI.pluginOn(pluginId, channel, callback)
window.electronAPI.dialog.openFolder()
window.electronAPI.window.minimize/maximize/close()
```

---

## ✨ Next Steps

### Phase 1 ✅ - Project Setup
- [x] Folder structure
- [x] Dependencies installed
- [x] Vite config
- [x] .gitignore

### Phase 2 ✅ - Main Process
- [x] main.js
- [x] plugin-manager.js
- [x] core-api.js
- [x] ipc-handlers.js
- [x] preload.js

### Phase 3 ✅ - Renderer
- [x] React app structure
- [x] Plugin store (Zustand)
- [x] Plugin hooks
- [x] UI components
- [x] Pages

### Phase 4 ✅ - Device Adapters
- [x] Serial adapter
- [x] HID adapter

### Phase 5 ✅ - Sample Plugins
- [x] serial-monitor
- [x] ssh-terminal

### Phase 6 - Future Enhancements
- [ ] Plugin marketplace/discovery
- [ ] Plugin permissions UI
- [ ] Error boundaries for plugin panels
- [ ] Plugin update mechanism
- [ ] Auto-update for app
- [ ] Testing suite
- [ ] CI/CD pipeline
- [ ] Documentation site

---

## 📝 License

MIT

---

**Ready to start?** Run `npm run dev` and start building! 🚀
