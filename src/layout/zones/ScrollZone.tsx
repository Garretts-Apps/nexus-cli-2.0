import React from 'react'
import { useZone } from '../ZoneContext.js'

export function ScrollZone(): React.ReactElement {
  const _zone = useZone('scrollable')
  // Phase 2 placeholder — actual message content registered via zone.register()
  return React.createElement('div', { className: 'zone-scrollable' })
}
