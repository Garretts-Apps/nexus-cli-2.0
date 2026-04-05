/**
 * Model command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const modelHandler: CommandHandler = {
  name: 'model',
  description: 'View or change the active model',
  priority: 75,

  matches(name: string): boolean {
    return name === 'model'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
