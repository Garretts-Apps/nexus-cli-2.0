import type { ExecutionContext } from './CommandContext.js'
import type { CommandHandler, HandlerResult } from './CommandBus.js'

export type Middleware = (
  ctx: ExecutionContext,
  handler: CommandHandler,
  next: () => Promise<HandlerResult>,
) => Promise<HandlerResult>

export function composeMiddleware(middlewares: Middleware[]): Middleware {
  return async (ctx, handler, next) => {
    let index = -1
    const dispatch = async (i: number): Promise<HandlerResult> => {
      if (i <= index) return { kind: 'skip' }
      index = i
      const middleware = middlewares[i]
      if (!middleware) return next()
      return middleware(ctx, handler, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}
