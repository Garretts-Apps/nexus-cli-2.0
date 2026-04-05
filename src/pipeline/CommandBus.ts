/**
 * CommandBus - middleware-style command handler registry and dispatcher.
 *
 * Replaces the monolithic withRetry pattern with a decoupled, composable
 * handler-based architecture where each command is a self-describing handler.
 */

import type React from 'react'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import type { ExecutionContext } from './CommandContext'

/**
 * Result variants from command execution.
 */
export type HandlerResult =
  | { kind: 'text'; value: string }
  | { kind: 'jsx'; node: React.ReactNode }
  | { kind: 'prompt'; blocks: ContentBlockParam[] }
  | { kind: 'skip' }

/**
 * Command handler that processes user input.
 *
 * Self-describes execution, enabling type-based dispatch without
 * discriminated unions or switch statements.
 */
export interface CommandHandler {
  /** Unique handler identifier */
  readonly name: string
  /** Command aliases (shortcuts) */
  readonly aliases?: string[]
  /** Human-readable description */
  readonly description: string
  /** Priority for dispatch ordering (higher = earlier) */
  readonly priority: number
  /** Optional enablement check */
  readonly isEnabled?: () => boolean
  /** Check if this handler should process the input */
  matches(name: string): boolean
  /** Execute the command */
  execute(ctx: ExecutionContext): Promise<HandlerResult>
  /** Optional: render UI for this command */
  render?(ctx: ExecutionContext): Promise<React.ReactNode | null>
}

/**
 * CommandBus - registry and dispatcher for command handlers.
 */
export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map()

  /**
   * Register a handler.
   */
  register(handler: CommandHandler): void {
    this.handlers.set(handler.name, handler)
  }

  /**
   * Unregister a handler by name.
   */
  unregister(name: string): void {
    this.handlers.delete(name)
  }

  /**
   * Get a handler by name.
   */
  get(name: string): CommandHandler | undefined {
    return this.handlers.get(name)
  }

  /**
   * Get all registered handlers, sorted by priority.
   */
  getAll(): CommandHandler[] {
    return Array.from(this.handlers.values()).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Find a handler that matches the given name.
   *
   * Searches in priority order (highest first).
   */
  findHandler(name: string): CommandHandler | undefined {
    const sorted = this.getAll()
    return sorted.find((h) => h.isEnabled?.() !== false && h.matches(name))
  }

  /**
   * Dispatch a command to the appropriate handler.
   */
  async dispatch(ctx: ExecutionContext): Promise<HandlerResult> {
    const handler = this.findHandler(ctx.commandName)
    if (!handler) {
      return { kind: 'skip' }
    }
    return handler.execute(ctx)
  }
}
