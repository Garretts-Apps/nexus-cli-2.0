import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { ScopedMcpServerConfig } from '../types.js'

export type ConnectionStateKind =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'needs-auth'
  | 'disabled'

export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'connecting'; startedAt: number }
  | { kind: 'connected'; connectedAt: number; client: Client; capabilities: Record<string, unknown> }
  | { kind: 'failed'; error: string; failedAt: number; retryCount: number }
  | { kind: 'needs-auth'; authUrl?: string }
  | { kind: 'disabled' }

export class ConnectionFSM {
  readonly serverName: string
  readonly config: ScopedMcpServerConfig
  private _state: ConnectionState

  constructor(serverName: string, config: ScopedMcpServerConfig) {
    this.serverName = serverName
    this.config = config
    this._state = { kind: 'idle' }
  }

  get state(): ConnectionState {
    return this._state
  }

  // Typed transitions — throw if invalid
  toConnecting(): void {
    const kind = this._state.kind
    if (!['idle', 'failed', 'needs-auth', 'disabled'].includes(kind)) {
      throw new Error(`Cannot transition from ${kind} to connecting`)
    }
    this._state = { kind: 'connecting', startedAt: Date.now() }
  }

  toConnected(client: Client, capabilities: Record<string, unknown>): void {
    if (this._state.kind !== 'connecting') {
      throw new Error(`Cannot transition from ${this._state.kind} to connected`)
    }
    this._state = { kind: 'connected', connectedAt: Date.now(), client, capabilities }
  }

  toFailed(error: string): void {
    const kind = this._state.kind
    if (!['connecting', 'connected'].includes(kind)) {
      throw new Error(`Cannot transition from ${kind} to failed`)
    }
    const retryCount = this._state.kind === 'failed' ? this._state.retryCount + 1 : 0
    this._state = { kind: 'failed', error, failedAt: Date.now(), retryCount }
  }

  toNeedsAuth(authUrl?: string): void {
    const kind = this._state.kind
    if (!['connecting', 'connected'].includes(kind)) {
      throw new Error(`Cannot transition from ${kind} to needs-auth`)
    }
    this._state = { kind: 'needs-auth', authUrl }
  }

  toDisabled(): void {
    this._state = { kind: 'disabled' }
  }

  toIdle(): void {
    const kind = this._state.kind
    if (!['failed', 'disabled'].includes(kind)) {
      throw new Error(`Cannot transition from ${kind} to idle`)
    }
    this._state = { kind: 'idle' }
  }
}
