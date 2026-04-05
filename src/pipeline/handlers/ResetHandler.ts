/**
 * Reset command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const resetHandler: CommandHandler = {
  name: 'reset',
  description: 'Reset state or configuration',
  priority: 50,

  matches(name: string): boolean {
    return name === 'reset'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
