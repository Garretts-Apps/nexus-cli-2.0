import React, { useMemo, useState } from 'react'
import { ZoneContextProvider, type ZoneContextValue } from './ZoneContext.js'
import { createLayoutEngine, type LayoutEngine } from './LayoutEngine.js'
import type { ZoneConfig, ZoneId } from './ZoneConfig.js'
import { DEFAULT_ZONE_LAYOUT } from './ZoneConfig.js'

interface ZoneProviderProps {
  zones?: ZoneConfig[]
  children: (engine: LayoutEngine) => React.ReactNode
}

export function ZoneProvider({ zones, children }: ZoneProviderProps): React.ReactElement {
  const [registrations, setRegistrations] = useState<Map<ZoneId, React.ReactNode[]>>(new Map())

  const engine = useMemo(() => createLayoutEngine(zones ?? DEFAULT_ZONE_LAYOUT), [zones])

  const contextValue: ZoneContextValue = useMemo(() => ({
    register: (zoneId: ZoneId, content: React.ReactNode) => {
      setRegistrations(prev => {
        const next = new Map(prev)
        const current = next.get(zoneId) ?? []
        next.set(zoneId, [...current, content])
        return next
      })
      return () => {
        setRegistrations(prev => {
          const next = new Map(prev)
          const current = next.get(zoneId) ?? []
          next.set(zoneId, current.filter(c => c !== content))
          return next
        })
      }
    },
    getContent: (zoneId: ZoneId) => registrations.get(zoneId) ?? [],
  }), [registrations])

  return (
    <ZoneContextProvider value={contextValue}>
      {children(engine)}
    </ZoneContextProvider>
  )
}
