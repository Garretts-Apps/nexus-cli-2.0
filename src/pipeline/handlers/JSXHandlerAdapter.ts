import type { Command, CommandBase, LocalJSXCommandModule } from '../../types/command.js'
import type { ExecutionContext } from '../CommandContext.js'
import type { CommandHandler, HandlerResult } from '../CommandBus.js'

type LocalJSXCommandShape = CommandBase & {
  type: 'local-jsx'
  load: () => Promise<LocalJSXCommandModule>
}

export class JSXHandlerAdapter implements CommandHandler {
  readonly name: string
  readonly aliases: string[] | undefined
  readonly description: string
  readonly priority: number
  readonly availability: string[] | undefined
  private originalCommand: LocalJSXCommandShape

  constructor(cmd: Command & { type: 'local-jsx' }) {
    this.originalCommand = cmd as LocalJSXCommandShape
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
    const node = await impl.call(
      ctx.onDone,
      ctx.toolUseContext as Parameters<typeof impl.call>[1],
      ctx.input,
    )
    if (node != null) {
      return { kind: 'jsx', node }
    }
    return { kind: 'skip' }
  }
}
