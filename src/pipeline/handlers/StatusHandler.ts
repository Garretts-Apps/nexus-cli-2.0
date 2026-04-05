/**
 * Status command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const statusHandler: CommandHandler = {
  name: 'status',
  aliases: ['st'],
  description: 'Show system status',
  priority: 85,

  matches(name: string): boolean {
    return name === 'status' || name === 'st'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    // Delegate to legacy command system
    return { kind: 'skip' }
  },
}
