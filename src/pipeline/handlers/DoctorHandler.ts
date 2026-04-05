/**
 * Doctor command handler.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

export const doctorHandler: CommandHandler = {
  name: 'doctor',
  aliases: ['diag'],
  description: 'Run diagnostics and health checks',
  priority: 60,

  matches(name: string): boolean {
    return name === 'doctor' || name === 'diag'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    return { kind: 'skip' }
  },
}
