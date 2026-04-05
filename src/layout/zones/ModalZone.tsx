import React from 'react'
import { useZoneContent } from '../ZoneContext.js'

interface ModalZoneProps {
  id?: string
  visible?: boolean
  fullscreenOnly?: boolean
}

export function ModalZone({ id, visible = true }: ModalZoneProps): React.ReactElement | null {
  const content = useZoneContent('modal')

  if (!visible || content.length === 0) {
    return null
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  }

  return (
    <div id={id} className="zone-modal" style={style}>
      {content}
    </div>
  )
}
