/**
 * Help command handler - demonstrates command handler pattern.
 *
 * Replaces discriminated union dispatch with explicit handler object.
 */

import type { CommandHandler, HandlerResult } from '../CommandBus'
import type { ExecutionContext } from '../CommandContext'

/**
 * Help handler - provides command help and usage information.
 */
export const helpHandler: CommandHandler = {
  name: 'help',
  aliases: ['?', 'h'],
  description: 'Show help and available commands',
  priority: 100, // High priority

  matches(name: string): boolean {
    return name === 'help' || name === '?' || name === 'h'
  },

  async execute(ctx: ExecutionContext): Promise<HandlerResult> {
    // In a real implementation, this would call the help command logic
    const helpText = `
Nexus CLI - Available Commands
==============================
Type /help <command> for detailed help on a specific command.

Common Commands:
  /clear      - Clear the REPL
  /status     - Show system status
  /config     - Edit configuration
  /login      - Authenticate
  /logout     - Sign out
  
Use /help <command> for more details.
    `.trim()

    return {
      kind: 'text',
      value: helpText,
    }
  },
}
