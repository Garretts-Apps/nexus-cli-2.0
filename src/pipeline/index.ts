/**
 * Nexus Command Pipeline - middleware-style command handler architecture.
 *
 * Replaces flat registry + discriminated union dispatch with
 * handler objects that self-describe execution.
 */

export { type ExecutionContext, type DoneOptions, type OutputDisplay } from './CommandContext.js'
export { CommandBus, type CommandHandler, type HandlerResult } from './CommandBus.js'
export { PipelineRouter } from './PipelineRouter.js'
export { getBuiltInHandlers } from './handlers/index.js'
export { getOrCreateBus, _resetBusForTesting } from './CommandBusInstance.js'
