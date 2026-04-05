import React from 'react'
import { Box } from '../ink.js'
import type { ZoneConfig } from './ZoneConfig.js'
import { DEFAULT_ZONE_LAYOUT } from './ZoneConfig.js'
import type { ZoneContextValue } from './ZoneContext.js'

export interface LayoutEngine {
  zones: ZoneConfig[]
  render(context: ZoneContextValue): React.ReactNode
}

export function createLayoutEngine(zones?: ZoneConfig[]): LayoutEngine {
  const zoneConfigs = zones ?? DEFAULT_ZONE_LAYOUT

  return {
    zones: zoneConfigs,
    render: (context: ZoneContextValue) => {
      // Sort zones by priority descending (highest = rendered on top)
      const sorted = [...zoneConfigs].sort((a, b) => b.priority - a.priority)

      return React.createElement(
        Box,
        { flexDirection: 'column', width: '100%' },
        ...sorted.map(zone => {
          const content = context.getContent(zone.id)
          if (content.length === 0) return null

          const heightStyle: Record<string, unknown> =
            zone.height === 'fill'
              ? { flex: 1 }
              : zone.height === 'auto'
                ? {}
                : { height: zone.height }

          return React.createElement(
            Box,
            {
              key: zone.id,
              flexDirection: 'column' as const,
              width: '100%',
              ...heightStyle,
              overflowY: zone.scrollable ? ('auto' as const) : ('hidden' as const),
            },
            ...content,
          )
        }),
      )
    },
  }
}
