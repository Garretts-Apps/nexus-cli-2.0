/**
 * Skills command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const skillsHandler: CommandHandler = {
  name: 'skills',
  description: 'List available skills',
  priority: 65,

  matches(name: string): boolean {
    return name === 'skills'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
