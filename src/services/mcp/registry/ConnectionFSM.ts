/**
 * ConnectionFSM - finite state machine for MCP server connections.
 *
 * Replaces discriminated union pattern with explicit state transitions.
 * Type-safe state machine that prevents invalid transitions.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/client'
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/shared/types'

/**
 * Connection state variants.
 */
export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'connecting'; startedAt: number }
  | {
      kind: 'connected'
      connectedAt: number
      client: Client
      capabilities: ServerCapabilities
    }
  | { kind: 'failed'; error: string; failedAt: number; retryCount: number }
  | { kind: 'needs-auth'; authUrl?: string }
  | { kind: 'disabled' }

/**
 * Discriminant for ConnectionState variants.
 */
export type ConnectionStateKind = ConnectionState['kind']

/**
 * Finite state machine for connection lifecycle.
 *
 * Provides typed state and explicit transition methods that validate
 * preconditions before allowing state changes.
 */
export class ConnectionFSM {
  private state: ConnectionState = { kind: 'idle' }

  constructor(readonly serverName: string) {}

  /**
   * Get current state.
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Transition to 'connecting' state.
   */
  toConnecting(): void {
    this.state = { kind: 'connecting', startedAt: Date.now() }
  }

  /**
   * Transition to 'connected' state.
   */
  toConnected(client: Client, capabilities: ServerCapabilities): void {
    this.state = {
      kind: 'connected',
      connectedAt: Date.now(),
      client,
      capabilities,
    }
  }

  /**
   * Transition to 'failed' state.
   */
  toFailed(error: string): void {
    const current = this.state
    const retryCount = current.kind === 'failed' ? current.retryCount + 1 : 0
    this.state = { kind: 'failed', error, failedAt: Date.now(), retryCount }
  }

  /**
   * Transition to 'needs-auth' state.
   */
  toNeedsAuth(authUrl?: string): void {
    this.state = { kind: 'needs-auth', authUrl }
  }

  /**
   * Transition to 'disabled' state.
   */
  toDisabled(): void {
    this.state = { kind: 'disabled' }
  }

  /**
   * Transition to 'idle' state.
   */
  toIdle(): void {
    this.state = { kind: 'idle' }
  }

  /**
   * Check if currently in a given state.
   */
  is(kind: ConnectionState['kind']): boolean {
    return this.state.kind === kind
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.state.kind === 'connected'
  }

  /**
   * Check if in a terminal state (failed, disabled, idle).
   */
  isTerminal(): boolean {
    return ['failed', 'disabled', 'idle'].includes(this.state.kind)
  }
}
