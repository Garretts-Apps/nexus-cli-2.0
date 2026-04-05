/**
 * Memory command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const memoryHandler: CommandHandler = {
  name: 'memory',
  aliases: ['mem'],
  description: 'Manage conversation memory',
  priority: 65,

  matches(name: string): boolean {
    return name === 'memory' || name === 'mem'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
