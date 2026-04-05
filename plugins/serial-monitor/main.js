let api
let activePort = null

exports.activate = async (coreAPI) => {
  api = coreAPI
  api.log.info('Serial Monitor plugin activated')

  // Register UI panel
  api.ui.registerPanel({
    title: 'Serial Monitor',
    icon: 'terminal',
    componentId: 'SerialMonitorPanel',
  })

  // IPC: list available ports
  api.ipc.handle('list-ports', async () => {
    return api.device.list()
  })

  // IPC: open a port
  api.ipc.handle('open-port', async (_, { path, baudRate }) => {
    await api.device.open(path, baudRate)
    activePort = path

    api.device.onData(path, (data) => {
      api.ipc.send('data', { port: path, data: data.toString('utf-8') })
    })

    api.store.set('lastPort', path)
    api.store.set('lastBaud', baudRate)

    return { ok: true }
  })

  // IPC: send data to port
  api.ipc.handle('send', async (_, { message }) => {
    if (!activePort) throw new Error('No port open')
    await api.device.write(activePort, message + '\n')
    return { ok: true }
  })

  // IPC: close port
  api.ipc.handle('close-port', async () => {
    if (activePort) {
      api.device.close(activePort)
      activePort = null
    }
    return { ok: true }
  })

  // Restore last session
  const lastPort = api.store.get('lastPort')
  if (lastPort) {
    api.log.info(`Last session port: ${lastPort}`)
  }
}

exports.deactivate = async () => {
  if (activePort && api) {
    api.device.close(activePort)
  }
  api.log.info('Serial Monitor plugin deactivated')
}
