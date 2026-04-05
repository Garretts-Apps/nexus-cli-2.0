import React from 'react'
import { useZoneContent } from '../ZoneContext.js'

interface ScrollZoneProps {
  id?: string
  autoScroll?: boolean
  maxHeight?: number
}

export function ScrollZone({ id, autoScroll: _autoScroll, maxHeight }: ScrollZoneProps): React.ReactElement {
  const content = useZoneContent('scrollable')

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'auto',
    ...(maxHeight !== undefined ? { maxHeight } : {}),
  }

  return (
    <div id={id} className="zone-scrollable" style={style}>
      {content}
    </div>
  )
}
