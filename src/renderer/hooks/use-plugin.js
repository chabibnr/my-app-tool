import { useEffect, useCallback } from 'react'

/**
 * Hook to communicate with a specific plugin from renderer.
 *
 * Usage:
 *   const { call, on } = usePlugin('my-serial-plugin')
 *   const ports = await call('serial:list')
 *   on('serial:data', (data) => console.log(data))
 */
export function usePlugin(pluginId) {
  const call = useCallback(
    (channel, data) => window.electronAPI.pluginCall(pluginId, channel, data),
    [pluginId]
  )

  const on = useCallback(
    (channel, fn) => {
      const unsub = window.electronAPI.pluginOn(pluginId, channel, fn)
      return unsub
    },
    [pluginId]
  )

  return { call, on }
}

/**
 * Subscribe to a plugin event for the lifetime of a component.
 *
 * Usage:
 *   usePluginEvent('my-serial-plugin', 'serial:data', (data) => setState(data))
 */
export function usePluginEvent(pluginId, channel, fn) {
  useEffect(() => {
    const unsub = window.electronAPI.pluginOn(pluginId, channel, fn)
    return unsub
  }, [pluginId, channel])
}
