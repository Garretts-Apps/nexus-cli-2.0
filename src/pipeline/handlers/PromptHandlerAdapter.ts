import type { Command, CommandBase, PromptCommand } from '../../types/command.js'
import type { ExecutionContext } from '../CommandContext.js'
import type { CommandHandler, HandlerResult } from '../CommandBus.js'

type PromptCommandShape = CommandBase & PromptCommand

export class PromptHandlerAdapter implements CommandHandler {
  readonly name: string
  readonly aliases: string[] | undefined
  readonly description: string
  readonly priority: number
  readonly availability: string[] | undefined
  private originalCommand: PromptCommandShape

  constructor(cmd: Command & { type: 'prompt' }) {
    this.originalCommand = cmd as PromptCommandShape
    this.name = cmd.name
    this.aliases = cmd.aliases
    this.description = cmd.description
    this.priority = 50
    this.availability = cmd.availability
  }

  matches(name: string): boolean {
    return name === this.name || (this.aliases?.includes(name) ?? false)
  }

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    const blocks = await this.originalCommand.getPromptForCommand(
      ctx.input,
      ctx.toolUseContext!,
    )
    return { kind: 'prompt', blocks }
  }
}
