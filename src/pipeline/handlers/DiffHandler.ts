/**
 * Diff command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const diffHandler: CommandHandler = {
  name: 'diff',
  description: 'Show file differences',
  priority: 70,

  matches(name: string): boolean {
    return name === 'diff'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
