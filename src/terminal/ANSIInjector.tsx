/**
 * ANSIInjector component - replaces AlternateScreen's useInsertionEffect pattern.
 *
 * Handles ANSI control code injection into the terminal output.
 * Replaces the Claude Code pattern of useInsertionEffect for timing-critical
 * terminal control codes.
 */

import React, { useInsertionEffect } from 'react'

interface ANSIInjectorProps {
  /**
   * The ANSI codes to inject (e.g., ENTER_ALT_SCREEN).
   * These are written immediately during React's mutation phase.
   */
  enterCodes: string
  /**
   * The cleanup codes to write on unmount.
   * (e.g., EXIT_ALT_SCREEN, DISABLE_MOUSE_TRACKING)
   */
  exitCodes: string
  /**
   * Callback to write raw codes to terminal.
   */
  onWrite: (codes: string) => void
  /**
   * Optional callback when entering.
   */
  onEnter?: () => void
  /**
   * Optional callback when exiting.
   */
  onExit?: () => void
  children?: React.ReactNode
}

/**
 * ANSIInjector wraps useInsertionEffect for ANSI control code timing.
 *
 * useInsertionEffect (not useLayoutEffect) is critical here because:
 * - Runs during React's mutation phase, before layout effects
 * - Ensures ANSI codes reach terminal BEFORE first render output
 * - Prevents frame flicker when entering alt screen
 *
 * Nexus-specific: extracted as a named component for clarity vs inline useInsertionEffect.
 */
export function ANSIInjector({
  enterCodes,
  exitCodes,
  onWrite,
  onEnter,
  onExit,
  children,
}: ANSIInjectorProps): React.ReactNode {
  useInsertionEffect(() => {
    onWrite(enterCodes)
    onEnter?.()

    return () => {
      onExit?.()
      onWrite(exitCodes)
    }
  }, [enterCodes, exitCodes, onWrite, onEnter, onExit])

  return children
}
