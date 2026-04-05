/**
 * Show command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const showHandler: CommandHandler = {
  name: 'show',
  aliases: ['view'],
  description: 'Show details of an item',
  priority: 60,

  matches(name: string): boolean {
    return name === 'show' || name === 'view'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
