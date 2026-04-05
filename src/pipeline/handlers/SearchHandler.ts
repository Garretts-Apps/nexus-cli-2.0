/**
 * Search command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const searchHandler: CommandHandler = {
  name: 'search',
  aliases: ['find', 'grep'],
  description: 'Search for content',
  priority: 65,

  matches(name: string): boolean {
    return name === 'search' || name === 'find' || name === 'grep'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
