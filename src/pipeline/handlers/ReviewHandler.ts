/**
 * Review command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const reviewHandler: CommandHandler = {
  name: 'review',
  description: 'Review code changes',
  priority: 70,

  matches(name: string): boolean {
    return name === 'review'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
