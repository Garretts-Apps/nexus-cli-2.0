import React from 'react'
import { useZone } from '../ZoneContext.js'

export function ModalZone(): React.ReactElement {
  const _zone = useZone('modal')
  // Phase 2 placeholder — modal content registers here
  return React.createElement('div', { className: 'zone-modal' })
}
