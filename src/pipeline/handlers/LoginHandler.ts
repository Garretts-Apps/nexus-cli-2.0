/**
 * Login command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const loginHandler: CommandHandler = {
  name: 'login',
  description: 'Authenticate with the service',
  priority: 80,

  matches(name: string): boolean {
    return name === 'login'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
