/**
 * Execution context for command handlers.
 *
 * Unified context passed to all handlers, providing access to input,
 * app state, and callback for signaling completion.
 */

import type { AppState } from '../state/AppState'

/**
 * Display mode for command output.
 */
export type OutputDisplay = 'skip' | 'system' | 'user'

/**
 * Options for signaling command completion.
 */
export interface DoneOptions {
  /** How to display the output */
  display?: OutputDisplay
  /** Whether to trigger a follow-up query */
  shouldQuery?: boolean
}

/**
 * Execution context passed to command handlers.
 *
 * Provides access to the command input, app state, and a callback for
 * signaling completion with an optional result and options.
 */
export interface ExecutionContext {
  /** The raw input string that triggered this command */
  input: string
  /** The parsed command name */
  commandName: string
  /** Current application state */
  appState: AppState
  /** Abort signal for cancellation */
  abortSignal: AbortSignal
  /** Signal command completion with optional result and options */
  onDone: (result?: string, options?: DoneOptions) => void
}
