/**
 * Auth command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const authHandler: CommandHandler = {
  name: 'auth',
  description: 'Manage authentication',
  priority: 80,

  matches(name: string): boolean {
    return name === 'auth'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
