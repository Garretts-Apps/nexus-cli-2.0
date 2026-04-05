/**
 * Registry event types for lifecycle tracking.
 *
 * Allows subscribers to react to connection state changes
 * (connected, failed, needs-auth, etc).
 */

import type { ConnectionState } from './ConnectionFSM'

/**
 * Connection lifecycle events.
 * 'tools:changed' fires when tool registration changes for a server.
 */
export type RegistryEventType = 'connected' | 'failed' | 'needs-auth' | 'disabled' | 'removed' | 'tools:changed' | 'reload-all'

/**
 * Event payload for connection lifecycle.
 */
export interface RegistryEvent {
  serverName: string
  eventType: RegistryEventType
  state: ConnectionState
  timestamp: number
}

/**
 * Event handler function.
 */
export type RegistryEventHandler = (event: RegistryEvent) => void
