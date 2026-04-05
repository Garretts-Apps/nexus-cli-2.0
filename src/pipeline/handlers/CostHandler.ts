/**
 * Cost command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const costHandler: CommandHandler = {
  name: 'cost',
  aliases: ['usage'],
  description: 'Show token usage and cost',
  priority: 60,

  matches(name: string): boolean {
    return name === 'cost' || name === 'usage'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
