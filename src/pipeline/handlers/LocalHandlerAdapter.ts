import type { Command, CommandBase, LocalCommandModule } from '../../types/command.js'
import type { ExecutionContext } from '../CommandContext.js'
import type { CommandHandler, HandlerResult } from '../CommandBus.js'

type LocalCommandShape = CommandBase & {
  type: 'local'
  supportsNonInteractive: boolean
  load: () => Promise<LocalCommandModule>
}

export class LocalHandlerAdapter implements CommandHandler {
  readonly name: string
  readonly aliases: string[] | undefined
  readonly description: string
  readonly priority: number
  readonly availability: string[] | undefined
  private originalCommand: LocalCommandShape

  constructor(cmd: Command & { type: 'local' }) {
    this.originalCommand = cmd as LocalCommandShape
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
    const impl = await this.originalCommand.load()
    const result = await impl.call(ctx.input, ctx.toolUseContext as Parameters<typeof impl.call>[1])
    if (result.type === 'text') {
      return { kind: 'text', value: result.value }
    }
    return { kind: 'skip' }
  }
}
