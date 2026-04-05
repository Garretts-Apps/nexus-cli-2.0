/**
 * Import command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const importHandler: CommandHandler = {
  name: 'import',
  description: 'Import data or configuration',
  priority: 55,

  matches(name: string): boolean {
    return name === 'import'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
