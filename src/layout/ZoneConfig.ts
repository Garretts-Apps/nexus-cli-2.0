export type ZoneId = 'scrollable' | 'footer' | 'modal' | 'float' | 'overlay'

export interface ZoneConfig {
  id: ZoneId
  priority: number
  scrollable: boolean
  height: number | 'auto' | 'fill'
  focusable: boolean
  fullscreenOnly?: boolean
}

export const DEFAULT_ZONE_LAYOUT: ZoneConfig[] = [
  { id: 'scrollable', priority: 0, scrollable: true, height: 'fill', focusable: false },
  { id: 'overlay', priority: 1, scrollable: false, height: 'auto', focusable: true, fullscreenOnly: true },
  { id: 'float', priority: 2, scrollable: false, height: 'auto', focusable: false, fullscreenOnly: true },
  { id: 'modal', priority: 3, scrollable: false, height: 'auto', focusable: true, fullscreenOnly: true },
  { id: 'footer', priority: 4, scrollable: false, height: 'auto', focusable: true },
]

export function getZoneConfig(id: ZoneId, layout?: ZoneConfig[]): ZoneConfig | undefined {
  const zones = layout ?? DEFAULT_ZONE_LAYOUT
  return zones.find(z => z.id === id)
}
