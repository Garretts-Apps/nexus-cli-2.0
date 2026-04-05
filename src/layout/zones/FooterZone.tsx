import React from 'react'
import { useZoneContent } from '../ZoneContext.js'

interface FooterZoneProps {
  id?: string
  height?: number
  focusable?: boolean
}

export function FooterZone({ id, height }: FooterZoneProps): React.ReactElement {
  const content = useZoneContent('footer')

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    ...(height !== undefined ? { height } : {}),
  }

  return (
    <div id={id} className="zone-footer" style={style}>
      {content}
    </div>
  )
}
