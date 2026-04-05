let HID
try { HID = require('node-hid') } catch { HID = null }

const openDevices = new Map()

const hidAdapter = {
  list() {
    if (!HID) throw new Error('node-hid not installed')
    return HID.devices()
  },

  open(vendorId, productId) {
    if (!HID) throw new Error('node-hid not installed')
    const key = `${vendorId}:${productId}`
    if (openDevices.has(key)) return openDevices.get(key)
    const device = new HID.HID(vendorId, productId)
    openDevices.set(key, device)
    return device
  },

  write(vendorId, productId, data) {
    const device = this.open(vendorId, productId)
    device.write(data)
  },

  onData(vendorId, productId, callback) {
    const device = this.open(vendorId, productId)
    device.on('data', callback)
  },

  close(vendorId, productId) {
    const key = `${vendorId}:${productId}`
    const device = openDevices.get(key)
    if (device) { device.close(); openDevices.delete(key) }
  },

  closeAll() {
    for (const [key, device] of openDevices) {
      try { device.close() } catch {}
      openDevices.delete(key)
    }
  },
}

module.exports = hidAdapter
