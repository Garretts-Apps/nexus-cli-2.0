/**
 * LayoutEngine - assembles zones from config and dynamic registrations.
 *
 * Maintains a registry of zone content and assembles them according to
 * zone configuration. Replaces the hardcoded FullscreenLayout pattern.
 */

import type React from 'react'
import type { ZoneId, ZoneConfig } from './ZoneConfig'

/**
 * Registry of content for each zone.
 */
interface ZoneRegistry {
  [key: string]: React.ReactNode[]
}

/**
 * LayoutEngine - manages zone registration and assembly.
 */
export class LayoutEngine {
  private registry: ZoneRegistry = {}
  private subscriptions: Set<() => void> = new Set()

  /**
   * Register content for a zone.
   *
   * @returns Function to unregister this content
   */
  registerZoneContent(zoneId: ZoneId, content: React.ReactNode): () => void {
    if (!this.registry[zoneId]) {
      this.registry[zoneId] = []
    }
    this.registry[zoneId].push(content)
    this.notifySubscribers()

    return () => {
      const index = this.registry[zoneId].indexOf(content)
      if (index !== -1) {
        this.registry[zoneId].splice(index, 1)
        this.notifySubscribers()
      }
    }
  }

  /**
   * Get all content registered for a zone.
   */
  getZoneContent(zoneId: ZoneId): React.ReactNode[] {
    return this.registry[zoneId] ?? []
  }

  /**
   * Assemble all zones according to their configuration.
   *
   * Returns a map of zone IDs to arrays of content nodes.
   */
  assemble(zones: ZoneConfig[]): Record<ZoneId, React.ReactNode[]> {
    const result: Record<ZoneId, React.ReactNode[]> = {}
    for (const zone of zones) {
      result[zone.id as ZoneId] = this.getZoneContent(zone.id)
    }
    return result
  }

  /**
   * Subscribe to layout changes.
   *
   * @returns Function to unsubscribe
   */
  subscribe(callback: () => void): () => void {
    this.subscriptions.add(callback)
    return () => {
      this.subscriptions.delete(callback)
    }
  }

  /**
   * Clear all registered content.
   */
  clear(): void {
    this.registry = {}
    this.notifySubscribers()
  }

  private notifySubscribers(): void {
    for (const callback of this.subscriptions) {
      callback()
    }
  }
}
