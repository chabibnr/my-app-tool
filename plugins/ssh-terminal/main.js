const { Client } = require('ssh2')
const fs = require('fs')

/** @type {Map<string, { client: Client, stream: any, info: object }>} */
const sessions = new Map()
let _api = null

exports.activate = function activate(api) {
  _api = api
  api.log.info('SSH Terminal plugin activated')

  api.ui.registerPanel({
    title: 'SSH Terminal',
    icon: 'terminal',
    pluginId: 'ssh-terminal',
  })

  // Connect to an SSH server and open an interactive shell
  api.ipc.handle('connect', (_, { sessionId, host, port, username, password, privateKeyPath }) => {
    return new Promise((resolve, reject) => {
      if (sessions.has(sessionId)) {
        return reject(new Error(`Session ${sessionId} already exists`))
      }

      const client = new Client()

      const connectConfig = {
        host,
        port: port || 22,
        username,
        readyTimeout: 10000,
        // Support keyboard-interactive auth (common on Ubuntu/Debian)
        tryKeyboard: true,
      }

      if (privateKeyPath) {
        try {
          connectConfig.privateKey = fs.readFileSync(privateKeyPath)
        } catch {
          return reject(new Error(`Cannot read key file: ${privateKeyPath}`))
        }
      } else {
        connectConfig.password = password
      }

      // Handle keyboard-interactive auth (auto-respond with password)
      client.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
        finish(prompts.map(() => password || ''))
      })

      client.on('ready', () => {
        client.shell({ term: 'xterm-256color', rows: 24, cols: 80 }, (err, stream) => {
          if (err) {
            client.end()
            return reject(err)
          }

          sessions.set(sessionId, {
            client,
            stream,
            info: { host, port: port || 22, username },
          })

          stream.on('data', (data) => {
            api.ipc.send('data', {
              sessionId,
              data: Buffer.from(data).toString('base64'),
            })
          })

          stream.stderr.on('data', (data) => {
            api.ipc.send('data', {
              sessionId,
              data: Buffer.from(data).toString('base64'),
            })
          })

          stream.on('close', () => {
            sessions.delete(sessionId)
            api.ipc.send('session-closed', { sessionId })
            api.log.info(`SSH session closed: ${sessionId}`)
          })

          api.log.info(`SSH connected: ${username}@${host}`)
          _saveHistory(api, { host, port: port || 22, username, authType: privateKeyPath ? 'key' : 'password', keyPath: privateKeyPath || '' })
          resolve({ ok: true })
        })
      })

      client.on('error', (err) => {
        sessions.delete(sessionId)
        reject(new Error(err.message))
      })

      client.connect(connectConfig)
    })
  })

  // Send keystrokes / data to the remote shell
  api.ipc.handle('send', (_, { sessionId, data }) => {
    const session = sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    session.stream.write(Buffer.from(data, 'base64'))
    return { ok: true }
  })

  // Notify the remote of terminal resize
  api.ipc.handle('resize', (_, { sessionId, cols, rows }) => {
    const session = sessions.get(sessionId)
    if (session) {
      session.stream.setWindow(rows, cols, 0, 0)
    }
    return { ok: true }
  })

  // Gracefully disconnect a session
  api.ipc.handle('disconnect', async (_, { sessionId }) => {
    const session = sessions.get(sessionId)
    if (session) {
      try { session.client.end() } catch {}
      sessions.delete(sessionId)
    }
    return { ok: true }
  })

  // List active sessions
  api.ipc.handle('list-sessions', () => {
    return Array.from(sessions.entries()).map(([id, s]) => ({
      id,
      ...s.info,
    }))
  })

  // History
  api.ipc.handle('get-history', () => {
    return api.store.get('history', [])
  })

  api.ipc.handle('delete-history', (_, { id }) => {
    const history = api.store.get('history', [])
    api.store.set('history', history.filter(h => h.id !== id))
    return { ok: true }
  })

  api.ipc.handle('clear-history', () => {
    api.store.set('history', [])
    return { ok: true }
  })
}

function _saveHistory(api, { host, port, username, authType, keyPath }) {
  const MAX = 20
  const history = api.store.get('history', [])
  const id = `${username}@${host}:${port}`

  const entry = {
    id,
    host,
    port,
    username,
    authType,
    keyPath: authType === 'key' ? keyPath : '',
    label: `${username}@${host}`,
    lastUsed: Date.now(),
  }

  const filtered = history.filter(h => h.id !== id)
  api.store.set('history', [entry, ...filtered].slice(0, MAX))
}

exports.deactivate = function deactivate() {
  for (const [, session] of sessions) {
    try { session.client.end() } catch {}
  }
  sessions.clear()
  if (_api) _api.log.info('SSH Terminal plugin deactivated')
}
