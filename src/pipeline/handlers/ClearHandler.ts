/**
 * Clear command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

/**
 * Clear handler - clears the REPL screen.
 */
export const clearHandler: CommandHandler = {
  name: 'clear',
  aliases: ['cls', 'c'],
  description: 'Clear the REPL screen',
  priority: 90,

  matches(name: string): boolean {
    return name === 'clear' || name === 'cls' || name === 'c'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    // Clear screen logic would be implemented here
    // For now, return skip to let legacy system handle it
    return { kind: 'skip' }
  },
}
