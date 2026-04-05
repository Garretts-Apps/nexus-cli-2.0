/**
 * List command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const listHandler: CommandHandler = {
  name: 'list',
  aliases: ['ls', 'l'],
  description: 'List items',
  priority: 60,

  matches(name: string): boolean {
    return name === 'list' || name === 'ls' || name === 'l'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
