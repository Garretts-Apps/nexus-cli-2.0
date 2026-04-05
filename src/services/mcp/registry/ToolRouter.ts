import type { Tool } from '../../../Tool.js'

export interface ToolRouterEntry {
  serverName: string
  tool: Tool
}

export class ToolRouter {
  private tools: Map<string, ToolRouterEntry> = new Map()

  register(serverName: string, tools: Tool[]): void {
    // Namespace tool names: serverName__toolName
    tools.forEach(tool => {
      const namespacedName = `${serverName}__${tool.name}`
      this.tools.set(namespacedName, { serverName, tool })
    })
  }

  resolve(namespacedToolName: string): ToolRouterEntry | undefined {
    return this.tools.get(namespacedToolName)
  }

  allTools(): Tool[] {
    return Array.from(this.tools.values()).map(e => e.tool)
  }

  unregister(serverName: string): void {
    const toDelete: string[] = []
    this.tools.forEach((entry, namespacedName) => {
      if (entry.serverName === serverName) {
        toDelete.push(namespacedName)
      }
    })
    toDelete.forEach(name => this.tools.delete(name))
  }

  clear(): void {
    this.tools.clear()
  }
}
