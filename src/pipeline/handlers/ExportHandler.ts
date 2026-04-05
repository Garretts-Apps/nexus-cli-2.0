/**
 * Export command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const exportHandler: CommandHandler = {
  name: 'export',
  description: 'Export data or configuration',
  priority: 55,

  matches(name: string): boolean {
    return name === 'export'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
