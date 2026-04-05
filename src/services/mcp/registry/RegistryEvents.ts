import type { ConnectionFSM } from './ConnectionFSM.js'
import type { Tool } from '../../../Tool.js'
import type { Command } from '../../../types/command.js'
import type { ServerResource } from '../types.js'

export type RegistryEventType =
  | 'server:connected'
  | 'server:failed'
  | 'server:needs-auth'
  | 'server:disabled'
  | 'tools:changed'

export interface RegistryEntry {
  fsm: ConnectionFSM
  tools: Tool[]
  commands: Command[]
  resources: ServerResource[]
}

export interface RegistryEvent {
  type: RegistryEventType
  serverName: string
  entry: RegistryEntry
}

export type RegistryEventHandler = (event: RegistryEvent) => void
