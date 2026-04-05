/**
 * Version command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const versionHandler: CommandHandler = {
  name: 'version',
  aliases: ['ver', 'v'],
  description: 'Show version information',
  priority: 60,

  matches(name: string): boolean {
    return name === 'version' || name === 'ver' || name === 'v'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
