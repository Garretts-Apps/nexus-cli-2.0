import React from 'react'
import { useZone } from '../ZoneContext.js'

export function FooterZone(): React.ReactElement {
  const _zone = useZone('footer')
  // Phase 2 placeholder — PromptInput registers here in Phase 4
  return React.createElement('div', { className: 'zone-footer' })
}
