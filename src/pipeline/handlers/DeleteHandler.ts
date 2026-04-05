/**
 * Delete command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const deleteHandler: CommandHandler = {
  name: 'delete',
  aliases: ['rm', 'remove'],
  description: 'Delete an item',
  priority: 55,

  matches(name: string): boolean {
    return name === 'delete' || name === 'rm' || name === 'remove'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
