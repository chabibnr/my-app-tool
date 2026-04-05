/* eslint-disable @typescript-eslint/no-explicit-any */

let SerialPortClass: any = null
try {
  SerialPortClass = (require('serialport') as any).SerialPort
} catch {
  SerialPortClass = null
}

const openPorts = new Map<string, any>()

const serialAdapter = {
  async list(): Promise<unknown[]> {
    if (!SerialPortClass) throw new Error('serialport not installed')
    return (SerialPortClass as any).list()
  },

  async open(path: string, baudRate = 9600): Promise<{ ok: boolean; info?: string }> {
    if (!SerialPortClass) throw new Error('serialport not installed')
    if (openPorts.has(path)) return { ok: true, info: 'already open' }

    return new Promise((resolve, reject) => {
      const port = new SerialPortClass({ path, baudRate }, (err: Error | null) => {
        if (err) return reject(err)
        openPorts.set(path, port)
        resolve({ ok: true })
      })
    })
  },

  write(path: string, data: string | Buffer): Promise<{ ok: boolean }> {
    const port = openPorts.get(path)
    if (!port) throw new Error(`Port ${path} not open`)
    return new Promise((resolve, reject) => {
      port.write(data, (err: Error | null | undefined) => (err ? reject(err) : resolve({ ok: true })))
    })
  },

  onData(path: string, callback: (data: Buffer) => void): void {
    const port = openPorts.get(path)
    if (!port) throw new Error(`Port ${path} not open`)
    port.on('data', callback)
  },

  close(path: string): void {
    const port = openPorts.get(path)
    if (!port) return
    port.close()
    openPorts.delete(path)
  },

  closeAll(): void {
    for (const [path] of openPorts) this.close(path)
  },
}

export = serialAdapter
