/**
 * Session command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const sessionHandler: CommandHandler = {
  name: 'session',
  aliases: ['sess'],
  description: 'Manage sessions',
  priority: 75,

  matches(name: string): boolean {
    return name === 'session' || name === 'sess'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
