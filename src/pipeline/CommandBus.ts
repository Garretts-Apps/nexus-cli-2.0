import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { ExecutionContext } from './CommandContext.js'
import type { Middleware } from './CommandMiddleware.js'

export interface CommandHandler {
  readonly name: string
  readonly aliases?: string[]
  readonly description: string
  readonly priority: number
  readonly isEnabled?: () => boolean
  readonly availability?: string[]

  matches(name: string): boolean
  execute(ctx: ExecutionContext): Promise<HandlerResult>
  render?(ctx: ExecutionContext): Promise<React.ReactNode | null>
}

export type HandlerResult =
  | { kind: 'text'; value: string }
  | { kind: 'jsx'; node: React.ReactNode }
  | { kind: 'prompt'; blocks: ContentBlockParam[] }
  | { kind: 'skip' }

export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map()
  private middlewares: Middleware[] = []

  register(handler: CommandHandler): void {
    this.handlers.set(handler.name, handler)
  }

  registerMany(handlers: CommandHandler[]): void {
    handlers.forEach(h => this.register(h))
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware)
  }

  async dispatch(ctx: ExecutionContext): Promise<HandlerResult> {
    const handler = this.find(ctx.commandName)
    if (!handler) return { kind: 'skip' }

    let result: HandlerResult = { kind: 'skip' }
    const executeHandler = async (): Promise<HandlerResult> => {
      result = await handler.execute(ctx)
      return result
    }

    // Chain middlewares
    const middlewaresCopy = [...this.middlewares].reverse()
    let chain: () => Promise<HandlerResult> = executeHandler
    for (const middleware of middlewaresCopy) {
      const next = chain
      const currentMiddleware = middleware
      chain = async () => currentMiddleware(ctx, handler, next)
    }

    await chain()
    return result
  }

  find(name: string): CommandHandler | undefined {
    return Array.from(this.handlers.values())
      .sort((a, b) => b.priority - a.priority)
      .find(h => h.matches(name))
  }

  list(): CommandHandler[] {
    return Array.from(this.handlers.values()).sort(
      (a, b) => b.priority - a.priority,
    )
  }
}

export function createCommandBus(): CommandBus {
  return new CommandBus()
}
