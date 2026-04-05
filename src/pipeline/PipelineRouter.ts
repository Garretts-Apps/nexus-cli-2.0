/**
 * PipelineRouter - priority-based router for command dispatch.
 *
 * Routes commands to handlers based on priority and matching rules,
 * eliminating the need for string-literal discriminated unions.
 */

import type { CommandHandler } from './CommandBus'

/**
 * Routes incoming commands to the appropriate handler.
 *
 * Maintains a priority queue of handlers and efficiently finds matches
 * based on command name and handler matching rules.
 */
export class PipelineRouter {
  private handlers: CommandHandler[] = []

  /**
   * Add a handler to the routing table.
   */
  addHandler(handler: CommandHandler): void {
    this.handlers.push(handler)
    // Keep sorted by priority (highest first)
    this.handlers.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Remove a handler from the routing table.
   */
  removeHandler(name: string): void {
    this.handlers = this.handlers.filter((h) => h.name !== name)
  }

  /**
   * Find the best handler for a command name.
   *
   * Returns the highest-priority enabled handler that matches the name.
   * Returns undefined if no handler matches or all matching handlers are disabled.
   */
  route(commandName: string): CommandHandler | undefined {
    return this.handlers.find((h) => h.isEnabled?.() !== false && h.matches(commandName))
  }

  /**
   * Get all handlers for the given command name (in priority order).
   *
   * Useful for debugging and testing.
   */
  findAll(commandName: string): CommandHandler[] {
    return this.handlers.filter((h) => h.matches(commandName))
  }

  /**
   * Get the full list of handlers in priority order.
   */
  getHandlers(): ReadonlyArray<CommandHandler> {
    return this.handlers
  }
}
