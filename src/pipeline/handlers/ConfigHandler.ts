/**
 * Config command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const configHandler: CommandHandler = {
  name: 'config',
  aliases: ['cfg'],
  description: 'Edit configuration settings',
  priority: 75,

  matches(name: string): boolean {
    return name === 'config' || name === 'cfg'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
