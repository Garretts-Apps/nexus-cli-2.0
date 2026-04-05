/**
 * Compact command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const compactHandler: CommandHandler = {
  name: 'compact',
  description: 'Compact conversation history',
  priority: 70,

  matches(name: string): boolean {
    return name === 'compact'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
