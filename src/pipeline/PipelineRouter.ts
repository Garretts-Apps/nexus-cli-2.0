import { CommandBus, type CommandHandler } from './CommandBus.js'

export interface RouterConfig {
  handlers: CommandHandler[]
}

export function createPriorityRouter(config: RouterConfig): CommandBus {
  const bus = new CommandBus()

  // Sort by priority descending
  const sorted = [...config.handlers].sort((a, b) => b.priority - a.priority)
  bus.registerMany(sorted)

  return bus
}
