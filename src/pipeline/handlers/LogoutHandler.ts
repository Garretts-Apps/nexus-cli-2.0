/**
 * Logout command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const logoutHandler: CommandHandler = {
  name: 'logout',
  description: 'Sign out of the service',
  priority: 80,

  matches(name: string): boolean {
    return name === 'logout'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
