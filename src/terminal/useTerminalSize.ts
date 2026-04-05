/**
 * useTerminalSize hook - replaces useSyncExternalStore pattern.
 *
 * Provides terminal size as a React hook instead of using external store pattern.
 * Simpler, more familiar API for components needing viewport dimensions.
 */

import { useTerminal } from './TerminalContext'
import type { TerminalSize } from './TerminalSession'

/**
 * Get current terminal size (columns and rows).
 *
 * Replaces useSyncExternalStore which was the Claude Code pattern
 * for reading external terminal state.
 */
export function useTerminalSize(): TerminalSize {
  const { size } = useTerminal()
  return size
}
