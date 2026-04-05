/**
 * Copy command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const copyHandler: CommandHandler = {
  name: 'copy',
  aliases: ['cp'],
  description: 'Copy content to clipboard',
  priority: 70,

  matches(name: string): boolean {
    return name === 'copy' || name === 'cp'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
