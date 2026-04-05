/**
 * Zone configuration for the layout system.
 *
 * Replaces hardcoded named prop-slots with declarative zone definitions.
 * Zones are areas of the UI where components can register content dynamically.
 */

/**
 * Unique identifier for a zone in the layout.
 */
export type ZoneId = 'scrollable' | 'overlay' | 'float' | 'modal' | 'footer'

/**
 * Configuration for a single zone.
 */
export interface ZoneConfig {
  /** Unique zone identifier */
  id: ZoneId
  /** Priority for rendering (higher = rendered later, on top) */
  priority: number
  /** Whether content in this zone can be scrolled */
  scrollable: boolean
  /** Height behavior: fixed pixels, 'auto' for content, 'fill' for remaining space */
  height: number | 'auto' | 'fill'
  /** Whether this zone can receive focus */
  focusable: boolean
  /** Only render this zone in fullscreen mode */
  fullscreenOnly?: boolean
}

/**
 * Default zone layout configuration.
 *
 * Defines zones in priority order (low to high):
 * - scrollable: Main content area, fills available space
 * - overlay: System overlays (always visible)
 * - float: Floating content (fullscreen only)
 * - modal: Focused modal dialogs (fullscreen only)
 * - footer: Input prompt at bottom
 */
export const DEFAULT_ZONE_LAYOUT: ZoneConfig[] = [
  {
    id: 'scrollable',
    priority: 0,
    scrollable: true,
    height: 'fill',
    focusable: false,
  },
  {
    id: 'overlay',
    priority: 1,
    scrollable: false,
    height: 'auto',
    focusable: true,
    fullscreenOnly: true,
  },
  {
    id: 'float',
    priority: 2,
    scrollable: false,
    height: 'auto',
    focusable: false,
    fullscreenOnly: true,
  },
  {
    id: 'modal',
    priority: 3,
    scrollable: false,
    height: 'auto',
    focusable: true,
    fullscreenOnly: true,
  },
  {
    id: 'footer',
    priority: 4,
    scrollable: false,
    height: 'auto',
    focusable: true,
  },
]
