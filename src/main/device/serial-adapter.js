let SerialPort
try { SerialPort = require('serialport').SerialPort } catch { SerialPort = null }

const openPorts = new Map()

const serialAdapter = {
  async list() {
    if (!SerialPort) throw new Error('serialport not installed')
    const { SerialPort: SP } = require('serialport')
    return SP.list()
  },

  async open(path, baudRate = 9600) {
    if (!SerialPort) throw new Error('serialport not installed')
    if (openPorts.has(path)) return { ok: true, info: 'already open' }

    return new Promise((resolve, reject) => {
      const port = new SerialPort({ path, baudRate }, (err) => {
        if (err) return reject(err)
        openPorts.set(path, port)
        resolve({ ok: true })
      })
    })
  },

  write(path, data) {
    const port = openPorts.get(path)
    if (!port) throw new Error(`Port ${path} not open`)
    return new Promise((resolve, reject) => {
      port.write(data, err => err ? reject(err) : resolve({ ok: true }))
    })
  },

  onData(path, callback) {
    const port = openPorts.get(path)
    if (!port) throw new Error(`Port ${path} not open`)
    port.on('data', callback)
  },

  close(path) {
    const port = openPorts.get(path)
    if (!port) return
    port.close()
    openPorts.delete(path)
  },

  closeAll() {
    for (const [path] of openPorts) this.close(path)
  },
}

module.exports = serialAdapter
