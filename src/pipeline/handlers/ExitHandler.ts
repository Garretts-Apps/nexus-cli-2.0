/**
 * Exit command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const exitHandler: CommandHandler = {
  name: 'exit',
  aliases: ['quit', 'q'],
  description: 'Exit the application',
  priority: 95,

  matches(name: string): boolean {
    return name === 'exit' || name === 'quit' || name === 'q'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
