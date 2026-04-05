/**
 * Resume command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const resumeHandler: CommandHandler = {
  name: 'resume',
  description: 'Resume a previous session',
  priority: 75,

  matches(name: string): boolean {
    return name === 'resume'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
