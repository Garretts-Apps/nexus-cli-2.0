/**
 * MCP command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const mcpHandler: CommandHandler = {
  name: 'mcp',
  description: 'Manage MCP server connections',
  priority: 60,

  matches(name: string): boolean {
    return name === 'mcp'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
