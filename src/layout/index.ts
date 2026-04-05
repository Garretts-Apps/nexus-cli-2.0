/**
 * Nexus Zone Renderer - declarative layout system.
 *
 * Replaces hardcoded named prop-slots with dynamic zone registration.
 * Components register content into zones, and LayoutEngine assembles them.
 */

export { type ZoneId, type ZoneConfig, DEFAULT_ZONE_LAYOUT } from './ZoneConfig.js'
export { LayoutEngine } from './LayoutEngine.js'
export { ZoneProvider, useZone, useZoneEngine, useZoneContent } from './ZoneContext.js'
export { ScrollZone } from './zones/ScrollZone.js'
export { FooterZone } from './zones/FooterZone.js'
export { ModalZone } from './zones/ModalZone.js'
export { OverlayZone } from './zones/OverlayZone.js'
export { FloatZone } from './zones/FloatZone.js'
