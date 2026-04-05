/**
 * React context for zone registration and access.
 *
 * Provides the LayoutEngine to components so they can register content
 * into zones without prop drilling.
 */

import React, { createContext, useContext } from 'react'
import { LayoutEngine } from './LayoutEngine'
import type { ZoneId } from './ZoneConfig'

/**
 * Zone context value - provides access to the layout engine.
 */
interface ZoneContextValue {
  engine: LayoutEngine
}

const ZoneContextRef = createContext<ZoneContextValue | undefined>(undefined)

/**
 * Hook to access the layout engine.
 *
 * Must be called within a ZoneProvider.
 */
export function useZoneEngine(): LayoutEngine {
  const context = useContext(ZoneContextRef)
  if (!context) {
    throw new Error('useZoneEngine must be called within ZoneProvider')
  }
  return context.engine
}

/**
 * Hook to register content into a zone.
 *
 * @returns Function to unregister
 */
export function useZone(zoneId: ZoneId, content: React.ReactNode): () => void {
  const engine = useZoneEngine()
  const [unregister] = React.useState(() => engine.registerZoneContent(zoneId, content))

  React.useEffect(() => {
    return unregister
  }, [unregister])

  return unregister
}

/**
 * Hook to read all content registered for a zone.
 *
 * Returns an empty array when no content is registered (backward compatible).
 */
export function useZoneContent(zoneId: ZoneId): React.ReactNode[] {
  const context = useContext(ZoneContextRef)
  if (!context) {
    return []
  }
  return context.engine.getZoneContent(zoneId)
}

/**
 * Provider component that wraps the layout engine.
 *
 * Must wrap any components that use useZone or useZoneEngine.
 */
export function ZoneProvider({
  children,
  engine = new LayoutEngine(),
}: {
  children: React.ReactNode
  engine?: LayoutEngine
}) {
  return (
    <ZoneContextRef.Provider value={{ engine }}>
      {children}
    </ZoneContextRef.Provider>
  )
}
