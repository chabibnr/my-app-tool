import { useEffect, useCallback } from 'react'

/**
 * Hook to communicate with a specific plugin from renderer.
 *
 * Usage:
 *   const { call, on } = usePlugin('my-serial-plugin')
 *   const ports = await call('serial:list')
 *   on('serial:data', (data) => console.log(data))
 */
export function usePlugin(pluginId: string): {
  call: (channel: string, data?: unknown) => Promise<unknown>
  on: (channel: string, fn: (data: unknown) => void) => () => void
} {
  const call = useCallback(
    (channel: string, data?: unknown) => window.electronAPI.pluginCall(pluginId, channel, data),
    [pluginId],
  )

  const on = useCallback(
    (channel: string, fn: (data: unknown) => void) => {
      const unsub = window.electronAPI.pluginOn(pluginId, channel, fn)
      return unsub
    },
    [pluginId],
  )

  return { call, on }
}

/**
 * Subscribe to a plugin event for the lifetime of a component.
 *
 * Usage:
 *   usePluginEvent('my-serial-plugin', 'serial:data', (data) => setState(data))
 */
export function usePluginEvent(
  pluginId: string,
  channel: string,
  fn: (data: unknown) => void,
): void {
  useEffect(() => {
    const unsub = window.electronAPI.pluginOn(pluginId, channel, fn)
    return unsub
  }, [pluginId, channel, fn])
}
