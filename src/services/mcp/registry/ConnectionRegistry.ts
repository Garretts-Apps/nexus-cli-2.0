/**
 * ConnectionRegistry - manages all MCP server connections using FSM.
 *
 * Replaces MCPServerConnection discriminated union with explicit FSM,
 * providing type-safe state transitions and lifecycle management.
 */

import { ConnectionFSM } from './ConnectionFSM'
import type { ConnectionState } from './ConnectionFSM'
import { ToolRouter } from './ToolRouter'
import type { RegistryEventHandler, RegistryEventType } from './RegistryEvents'
import type { ScopedMcpServerConfig } from '../types'

/**
 * Entry in the connection registry.
 */
export interface RegistryEntry {
  serverName: string
  config: ScopedMcpServerConfig
  fsm: ConnectionFSM
}

/**
 * ConnectionRegistry - manages connections with FSM-backed state.
 */
export class ConnectionRegistry {
  private entries: Map<string, RegistryEntry> = new Map()
  private toolRouter: ToolRouter = new ToolRouter()
  private listeners: Map<RegistryEventType, Set<RegistryEventHandler>> = new Map()

  /**
   * Add a new server connection.
   */
  add(serverName: string, config: ScopedMcpServerConfig): void {
    if (this.entries.has(serverName)) {
      throw new Error(`Connection "${serverName}" already exists`)
    }
    this.entries.set(serverName, {
      serverName,
      config,
      fsm: new ConnectionFSM(serverName),
    })
  }

  /**
   * Remove a connection by name.
   */
  remove(serverName: string): void {
    const entry = this.entries.get(serverName)
    const lastState = entry?.fsm.getState()
    this.entries.delete(serverName)
    this.toolRouter.unregister(serverName)
    this.emit('removed', serverName, lastState)
  }

  /**
   * Get a connection entry by name.
   */
  get(serverName: string): RegistryEntry | undefined {
    return this.entries.get(serverName)
  }

  /**
   * List all connections.
   */
  list(): RegistryEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Reload a connection (reset to idle state).
   *
   * Replaces pluginReconnectKey increment pattern.
   */
  async reload(serverName: string): Promise<void> {
    const entry = this.get(serverName)
    if (!entry) return

    entry.fsm.toIdle()
    this.toolRouter.unregister(serverName)
    // In real implementation, would trigger reconnection
  }

  /**
   * Signal that all connections should be re-initialized.
   *
   * Replaces the AppState pluginReconnectKey counter. Emits 'reload-all'
   * so subscribers (useManageMCPConnections) can re-run connection effects.
   */
  reloadAll(): void {
    this.emitReloadAll()
  }

  private emitReloadAll(): void {
    const handlers = this.listeners.get('reload-all')
    if (!handlers) return
    for (const handler of handlers) {
      handler({
        serverName: '*',
        eventType: 'reload-all',
        state: { kind: 'idle' } as ConnectionState,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Subscribe to connection lifecycle events.
   */
  on(eventType: RegistryEventType, handler: RegistryEventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(handler)

    return () => {
      this.listeners.get(eventType)?.delete(handler)
    }
  }

  /**
   * Emit an event to all listeners.
   * @param precomputedState - optional state override, used when the entry has
   *   already been removed (e.g. 'removed' event emitted after delete).
   */
  private emit(eventType: RegistryEventType, serverName: string, precomputedState?: ConnectionState): void {
    const handlers = this.listeners.get(eventType)
    if (!handlers) return

    const entry = this.get(serverName)
    const state = precomputedState ?? entry?.fsm.getState()
    if (!state) return

    for (const handler of handlers) {
      handler({
        serverName,
        eventType,
        state,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Get the tool router for namespace-aware tool resolution.
   */
  getToolRouter(): ToolRouter {
    return this.toolRouter
  }
}
