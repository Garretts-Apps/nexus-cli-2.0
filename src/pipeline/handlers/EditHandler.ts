/**
 * Edit command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const editHandler: CommandHandler = {
  name: 'edit',
  description: 'Edit an item',
  priority: 60,

  matches(name: string): boolean {
    return name === 'edit'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
