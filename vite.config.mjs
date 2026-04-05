import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@xterm/xterm': path.resolve(__dirname, 'plugins/ssh-terminal/node_modules/@xterm/xterm'),
      '@xterm/addon-fit': path.resolve(__dirname, 'plugins/ssh-terminal/node_modules/@xterm/addon-fit'),
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
})
