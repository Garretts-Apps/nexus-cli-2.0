/**
 * TerminalSession manages the terminal's raw mode lifecycle and event handling.
 *
 * Owns stdin raw mode, resize listener, and cleanup. Replaces the pattern of
 * scattered useLayoutEffect calls in useInput + useEventCallback.
 */

import { EventEmitter } from 'events'

export type TerminalEventType = 'key' | 'resize'

export interface TerminalSize {
  columns: number
  rows: number
}

export interface TerminalEventHandler {
  (event: TerminalEventType, data?: unknown): void
}

export class TerminalSession extends EventEmitter {
  private stream: NodeJS.ReadStream
  private isRawMode: boolean = false
  private resizeListener?: () => void
  private size: TerminalSize

  constructor(stream: NodeJS.ReadStream = process.stdin) {
    super()
    this.stream = stream
    this.size = {
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    }
  }

  /**
   * Enter raw mode and set up resize listener.
   * Nexus-specific: encapsulates the timing-critical setup that was
   * scattered across useLayoutEffect calls in Claude Code's pattern.
   */
  enter(): void {
    if (this.isRawMode) return

    // Set raw mode on stdin
    if (this.stream.isTTY) {
      this.stream.setRawMode(true)
    }

    this.isRawMode = true

    // Listen for terminal resize events
    this.resizeListener = () => {
      this.size = {
        columns: process.stdout.columns || this.size.columns,
        rows: process.stdout.rows || this.size.rows,
      }
      this.emit('resize', this.size)
    }

    process.stdout.on('resize', this.resizeListener)
  }

  /**
   * Exit raw mode and clean up listeners.
   */
  exit(): void {
    if (!this.isRawMode) return

    // Exit raw mode
    if (this.stream.isTTY) {
      this.stream.setRawMode(false)
    }

    this.isRawMode = false

    // Remove resize listener
    if (this.resizeListener) {
      process.stdout.removeListener('resize', this.resizeListener)
      this.resizeListener = undefined
    }

    this.removeAllListeners()
  }

  /**
   * Subscribe to a terminal event with stable cleanup.
   * Replaces useEventCallback pattern for listener stability.
   */
  on(
    event: TerminalEventType,
    handler: (data?: unknown) => void
  ): () => void {
    super.on(event, handler)
    return () => {
      this.removeListener(event, handler)
    }
  }

  /**
   * Get current terminal size.
   */
  getSize(): TerminalSize {
    return { ...this.size }
  }

  /**
   * Check if in raw mode.
   */
  isActive(): boolean {
    return this.isRawMode
  }
}
