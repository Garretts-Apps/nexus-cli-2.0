import { ConnectionFSM } from './ConnectionFSM.js'
import { ToolRouter } from './ToolRouter.js'
import type { RegistryEntry, RegistryEventType, RegistryEventHandler } from './RegistryEvents.js'
import type { ScopedMcpServerConfig, ServerResource } from '../types.js'
import type { Tool } from '../../../Tool.js'
import type { Command } from '../../../types/command.js'

export class ConnectionRegistry {
  private entries: Map<string, RegistryEntry> = new Map()
  readonly toolRouter: ToolRouter = new ToolRouter()
  private eventHandlers: Map<RegistryEventType, RegistryEventHandler[]> = new Map()

  add(serverName: string, config: ScopedMcpServerConfig): void {
    const fsm = new ConnectionFSM(serverName, config)
    const entry: RegistryEntry = { fsm, tools: [], commands: [], resources: [] }
    this.entries.set(serverName, entry)
    fsm.toConnecting()
  }

  remove(serverName: string): void {
    const entry = this.entries.get(serverName)
    if (entry) {
      this.toolRouter.unregister(serverName)
      this.entries.delete(serverName)
    }
  }

  async reload(serverName: string): Promise<void> {
    const entry = this.entries.get(serverName)
    if (!entry) return
    entry.fsm.toIdle()
    entry.fsm.toConnecting()
    // Actual connection logic happens in useManageMCPConnections hook
  }

  async reloadFailed(): Promise<void> {
    for (const entry of this.entries.values()) {
      if (entry.fsm.state.kind === 'failed') {
        entry.fsm.toIdle()
        entry.fsm.toConnecting()
      }
    }
  }

  get(serverName: string): RegistryEntry | undefined {
    return this.entries.get(serverName)
  }

  list(): RegistryEntry[] {
    return Array.from(this.entries.values())
  }

  setTools(serverName: string, tools: Tool[]): void {
    const entry = this.entries.get(serverName)
    if (entry) {
      this.toolRouter.unregister(serverName)
      this.toolRouter.register(serverName, tools)
      entry.tools = tools
      this.emit('tools:changed', serverName)
    }
  }

  setCommands(serverName: string, commands: Command[]): void {
    const entry = this.entries.get(serverName)
    if (entry) {
      entry.commands = commands
    }
  }

  setResources(serverName: string, resources: ServerResource[]): void {
    const entry = this.entries.get(serverName)
    if (entry) {
      entry.resources = resources
    }
  }

  on(eventType: RegistryEventType, handler: RegistryEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        const idx = handlers.indexOf(handler)
        if (idx !== -1) handlers.splice(idx, 1)
      }
    }
  }

  private emit(eventType: RegistryEventType, serverName: string): void {
    const entry = this.entries.get(serverName)
    if (!entry) return
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(h => h({ type: eventType, serverName, entry }))
    }
  }
}
