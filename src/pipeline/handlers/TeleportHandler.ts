/**
 * Teleport command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const teleportHandler: CommandHandler = {
  name: 'teleport',
  aliases: ['tp'],
  description: 'Teleport to a different context',
  priority: 65,

  matches(name: string): boolean {
    return name === 'teleport' || name === 'tp'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
