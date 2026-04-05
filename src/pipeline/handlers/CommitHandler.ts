/**
 * Commit command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const commitHandler: CommandHandler = {
  name: 'commit',
  description: 'Commit changes to version control',
  priority: 70,

  matches(name: string): boolean {
    return name === 'commit'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
