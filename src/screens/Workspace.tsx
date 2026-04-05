import React from 'react'
import { ZoneProvider } from '../layout/ZoneContext.js'
import { ScrollZone } from '../layout/zones/ScrollZone.js'
import { OverlayZone } from '../layout/zones/OverlayZone.js'
import { FloatZone } from '../layout/zones/FloatZone.js'
import { ModalZone } from '../layout/zones/ModalZone.js'
import { FooterZone } from '../layout/zones/FooterZone.js'
import { useManagePlugins } from '../hooks/useManagePlugins.js'
import { REPL, type Props as REPLProps } from './REPL.js'

/**
 * Workspace wraps the app with ZoneProvider, renders zone containers,
 * and hosts plugin management before delegating to REPL.
 *
 * Phase 3 hook extraction: useManagePlugins moved here from REPL.
 * Zone components are optional display containers - the app works with or
 * without content registered into each zone.
 */
export function Workspace(props: REPLProps): React.ReactElement {
  const isRemoteSession = !!props.remoteSessionConfig

  // Group A: MCP / plugin management hooks (extracted from REPL in Phase 3)
  useManagePlugins({ enabled: !isRemoteSession })

  return (
    <ZoneProvider>
      <ScrollZone id="scrollable" autoScroll />
      <OverlayZone id="overlay" />
      <FloatZone id="float" />
      <ModalZone id="modal" />
      <FooterZone id="footer" />
      <REPL {...props} />
    </ZoneProvider>
  )
}
