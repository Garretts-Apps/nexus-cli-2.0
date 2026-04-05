import React from 'react'
import { useZone } from '../ZoneContext.js'

export function FloatZone(): React.ReactElement {
  const _zone = useZone('float')
  // Phase 2 placeholder — floating content registers here
  return React.createElement('div', { className: 'zone-float' })
}
