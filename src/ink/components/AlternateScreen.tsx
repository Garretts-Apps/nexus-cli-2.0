import React, { type PropsWithChildren, useContext } from 'react'
import instances from '../instances.js'
import {
  DISABLE_MOUSE_TRACKING,
  ENABLE_MOUSE_TRACKING,
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
} from '../termio/dec.js'
import { TerminalWriteContext } from '../useTerminalNotification.js'
import { ANSIInjector } from '../../../terminal/ANSIInjector.js'
import Box from './Box.js'
import { TerminalSizeContext } from './TerminalSizeContext.js'

type Props = PropsWithChildren<{
  /** Enable SGR mouse tracking (wheel + click/drag). Default true. */
  mouseTracking?: boolean
}>

/**
 * Run children in the terminal's alternate screen buffer, constrained to
 * the viewport height. While mounted:
 *
 * - Enters the alt screen (DEC 1049), clears it, homes the cursor
 * - Constrains its own height to the terminal row count, so overflow must
 *   be handled via `overflow: scroll` / flexbox (no native scrollback)
 * - Optionally enables SGR mouse tracking (wheel + click/drag) — events
 *   surface as `ParsedKey` (wheel) and update the Ink instance's
 *   selection state (click/drag)
 *
 * On unmount, disables mouse tracking and exits the alt screen, restoring
 * the main screen's content. Safe for use in ctrl-o transcript overlays
 * and similar temporary fullscreen views — the main screen is preserved.
 *
 * Notifies the Ink instance via `setAltScreenActive()` so the renderer
 * keeps the cursor inside the viewport (preventing the cursor-restore LF
 * from scrolling content) and so signal-exit cleanup can exit the alt
 * screen if the component's own unmount doesn't run.
 *
 * **Nexus refactor:** Now uses ANSIInjector component instead of useInsertionEffect.
 * This makes the timing-critical ANSI code injection more explicit and testable.
 */
export function AlternateScreen({
  children,
  mouseTracking = true,
}: Props): React.ReactNode {
  const size = useContext(TerminalSizeContext)
  const writeRaw = useContext(TerminalWriteContext)

  const enterCodes =
    ENTER_ALT_SCREEN +
    '\x1b[2J\x1b[H' +
    (mouseTracking ? ENABLE_MOUSE_TRACKING : '')

  const exitCodes =
    (mouseTracking ? DISABLE_MOUSE_TRACKING : '') + EXIT_ALT_SCREEN

  return (
    <ANSIInjector
      enterCodes={enterCodes}
      exitCodes={exitCodes}
      onWrite={(codes) => writeRaw?.(codes)}
      onEnter={() => {
        const ink = instances.get(process.stdout)
        ink?.setAltScreenActive(true, mouseTracking)
      }}
      onExit={() => {
        const ink = instances.get(process.stdout)
        ink?.setAltScreenActive(false)
        ink?.clearTextSelection()
      }}
    >
      <Box
        flexDirection="column"
        height={size?.rows ?? 24}
        width="100%"
        flexShrink={0}
      >
        {children}
      </Box>
    </ANSIInjector>
  )
}
