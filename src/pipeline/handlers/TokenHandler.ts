/**
 * Token command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const tokenHandler: CommandHandler = {
  name: 'token',
  description: 'Manage API tokens',
  priority: 75,

  matches(name: string): boolean {
    return name === 'token'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
