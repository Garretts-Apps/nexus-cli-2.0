import React, { createContext, useContext } from 'react'
import type { ZoneId } from './ZoneConfig.js'

export interface ZoneContextValue {
  register(zoneId: ZoneId, content: React.ReactNode): () => void
  getContent(zoneId: ZoneId): React.ReactNode[]
}

const ZoneContextImpl = createContext<ZoneContextValue | undefined>(undefined)

export function useZone(zoneId: ZoneId): {
  register: (content: React.ReactNode) => () => void
} {
  const ctx = useContext(ZoneContextImpl)
  if (!ctx) {
    throw new Error('useZone must be called within ZoneProvider')
  }
  return {
    register: (content: React.ReactNode) => ctx.register(zoneId, content),
  }
}

export function useZoneContent(zoneId: ZoneId): React.ReactNode[] {
  const ctx = useContext(ZoneContextImpl)
  if (!ctx) {
    throw new Error('useZoneContent must be called within ZoneProvider')
  }
  return ctx.getContent(zoneId)
}

export const ZoneContextProvider = ZoneContextImpl.Provider
