interface HIDModule {
  devices: () => HIDDeviceInfo[]
  HID: new (vendorId: number, productId: number) => HIDDevice
}

interface HIDDeviceInfo {
  vendorId: number
  productId: number
  [key: string]: unknown
}

interface HIDDevice {
  write: (data: number[]) => void
  on: (event: string, callback: (data: Buffer) => void) => void
  close: () => void
}

let HID: HIDModule | null = null
try {
  HID = require('node-hid') as HIDModule
} catch {
  HID = null
}

const openDevices = new Map<string, HIDDevice>()

const hidAdapter = {
  list(): HIDDeviceInfo[] {
    if (!HID) throw new Error('node-hid not installed')
    return HID.devices()
  },

  open(vendorId: number, productId: number): HIDDevice {
    if (!HID) throw new Error('node-hid not installed')
    const key = `${vendorId}:${productId}`
    const existing = openDevices.get(key)
    if (existing) return existing
    const device = new HID.HID(vendorId, productId)
    openDevices.set(key, device)
    return device
  },

  write(vendorId: number, productId: number, data: number[]): void {
    const device = this.open(vendorId, productId)
    device.write(data)
  },

  onData(vendorId: number, productId: number, callback: (data: Buffer) => void): void {
    const device = this.open(vendorId, productId)
    device.on('data', callback)
  },

  close(vendorId: number, productId: number): void {
    const key = `${vendorId}:${productId}`
    const device = openDevices.get(key)
    if (device) {
      device.close()
      openDevices.delete(key)
    }
  },

  closeAll(): void {
    for (const [key, device] of openDevices) {
      try {
        device.close()
      } catch {
        // ignore close errors
      }
      openDevices.delete(key)
    }
  },
}

export = hidAdapter
