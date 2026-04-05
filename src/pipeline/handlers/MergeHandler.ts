/**
 * Merge command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const mergeHandler: CommandHandler = {
  name: 'merge',
  description: 'Merge branches',
  priority: 70,

  matches(name: string): boolean {
    return name === 'merge'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
