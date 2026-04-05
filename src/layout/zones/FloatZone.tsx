import React from 'react'
import { useZoneContent } from '../ZoneContext.js'

interface FloatZoneProps {
  id?: string
  position?: string
  fullscreenOnly?: boolean
}

export function FloatZone({ id }: FloatZoneProps): React.ReactElement | null {
  const content = useZoneContent('float')

  if (content.length === 0) {
    return null
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    zIndex: 20,
  }

  return (
    <div id={id} className="zone-float" style={style}>
      {content}
    </div>
  )
}
