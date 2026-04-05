# Electron Plugin App

A modern Electron application with a plugin system and device communication capabilities.

## Features

- 🔌 **Plugin System**: Dynamic plugin loading with hot-reload support
- 📡 **Device Communication**: Built-in Serial and HID adapters
- ⚛️ **React UI**: Modern React-based renderer with Tailwind CSS
- 🎨 **Custom Titlebar**: Frameless window with custom controls
- 🔄 **State Management**: Zustand for efficient state management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Development

The app will start in development mode with hot-reload enabled:
- Renderer process runs on `http://localhost:6173`
- Main process runs with Electron

### Building

```bash
# Build for production
npm run build
```

The built application will be in the `dist/electron` directory.

## Project Structure

```
electron-plugin-app/
├── src/
│   ├── main/           # Main process (Electron)
│   │   ├── main.js     # App entry point
│   │   ├── plugin-manager.js
│   │   ├── core-api.js
│   │   ├── ipc-handlers.js
│   │   ├── preload.js
│   │   └── device/     # Device adapters
│   └── renderer/       # Renderer process (React)
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── stores/
├── plugins/            # Plugin directory
│   ├── serial-monitor/
│   └── ssh-terminal/
└── package.json
```

## Plugin Development

### Plugin Structure

Each plugin should have:
- `manifest.json`: Plugin metadata and configuration
- `main.js`: Plugin entry point with `activate()` and `deactivate()` functions

### Example Plugin

```javascript
// plugins/my-plugin/main.js
module.exports = {
  activate(coreAPI) {
    console.log('Plugin activated!');
    
    // Register IPC handlers
    coreAPI.registerHandler('my-plugin:action', async (event, data) => {
      return { success: true };
    });
  },
  
  deactivate() {
    console.log('Plugin deactivated!');
  }
};
```

```json
// plugins/my-plugin/manifest.json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "entry": "main.js"
}
```

## Available Device Adapters

### Serial Port
```javascript
const serial = coreAPI.getSerial();
await serial.list(); // List available ports
const port = await serial.open(path, options);
```

### HID
```javascript
const hid = coreAPI.getHID();
const devices = await hid.list();
const device = hid.open(path);
```

## Scripts

- `npm run dev` - Start in development mode
- `npm run dev:renderer` - Start Vite dev server only
- `npm run dev:electron` - Start Electron only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## License

MIT
