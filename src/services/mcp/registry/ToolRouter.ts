/**
 * ToolRouter - namespace-aware tool resolution.
 *
 * Maps namespaced tool names (server:toolName) to their implementations.
 * Replaces flat tool dictionary with hierarchical server → tool lookup.
 */

import type { Tool } from '@modelcontextprotocol/sdk/shared/types'

/**
 * Tool with server context.
 */
export interface ResolvedTool {
  serverName: string
  tool: Tool
}

/**
 * Routes tool names to their implementations.
 */
export class ToolRouter {
  private tools: Map<string, Map<string, Tool>> = new Map()

  /**
   * Register tools from a server.
   *
   * Keyed by server name, each server has a map of tool name -> tool.
   */
  register(serverName: string, tools: Tool[]): void {
    const serverTools = new Map<string, Tool>()
    for (const tool of tools) {
      serverTools.set(tool.name, tool)
    }
    this.tools.set(serverName, serverTools)
  }

  /**
   * Resolve a namespaced tool name (server:toolName) to its implementation.
   *
   * Returns undefined if the tool doesn't exist.
   */
  resolve(namespacedToolName: string): ResolvedTool | undefined {
    const [serverName, toolName] = namespacedToolName.split(':')
    if (!serverName || !toolName) return undefined

    const serverTools = this.tools.get(serverName)
    if (!serverTools) return undefined

    const tool = serverTools.get(toolName)
    if (!tool) return undefined

    return { serverName, tool }
  }

  /**
   * Get all tools, flattened.
   */
  allTools(): Tool[] {
    const result: Tool[] = []
    for (const serverTools of this.tools.values()) {
      result.push(...serverTools.values())
    }
    return result
  }

  /**
   * Unregister all tools from a server.
   */
  unregister(serverName: string): void {
    this.tools.delete(serverName)
  }

  /**
   * Get tools from a specific server.
   */
  getServerTools(serverName: string): Tool[] {
    const serverTools = this.tools.get(serverName)
    return serverTools ? Array.from(serverTools.values()) : []
  }
}
