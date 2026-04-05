import React from 'react'
import { useZoneContent } from '../ZoneContext.js'

interface OverlayZoneProps {
  id?: string
  position?: 'top' | 'bottom'
  fullscreenOnly?: boolean
}

export function OverlayZone({ id, position = 'top' }: OverlayZoneProps): React.ReactElement | null {
  const content = useZoneContent('overlay')

  if (content.length === 0) {
    return null
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
    zIndex: 10,
  }

  return (
    <div id={id} className="zone-overlay" style={style}>
      {content}
    </div>
  )
}
