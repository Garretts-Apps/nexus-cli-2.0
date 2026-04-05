/**
 * useTerminalEvent hook - replaces useInput + useEventCallback combo.
 *
 * Handles both listener stability and cleanup in a single abstraction.
 * Nexus-specific approach to managing terminal event subscriptions.
 */

import { useEffect, useCallback } from 'react'
import { useTerminal } from './TerminalContext'
import type { TerminalEventType } from './TerminalSession'

interface UseTerminalEventOptions {
  /**
   * Only subscribe when this condition is true.
   * Useful for conditional event handling.
   */
  when?: boolean
}

/**
 * Subscribe to terminal events (key, resize, etc).
 *
 * Replaces the Claude Code pattern of:
 * - useLayoutEffect for raw mode setup
 * - useEventCallback for listener stability
 *
 * This consolidates both concerns into one hook.
 */
export function useTerminalEvent(
  eventType: TerminalEventType,
  handler: (data?: unknown) => void,
  options: UseTerminalEventOptions = {}
): void {
  const { session } = useTerminal()
  const { when = true } = options

  // Stable handler callback
  const stableHandler = useCallback(handler, [handler])

  useEffect(() => {
    if (!when) return

    // Subscribe to event
    const unsubscribe = session.on(eventType, stableHandler)

    // Cleanup subscription
    return unsubscribe
  }, [session, eventType, stableHandler, when])
}
