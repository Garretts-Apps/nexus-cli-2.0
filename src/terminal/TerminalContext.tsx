/**
 * React context for TerminalSession.
 *
 * Provides terminal session and size information to descendant components
 * without prop drilling. Replaces useSyncExternalStore pattern.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { TerminalSession, type TerminalSize } from './TerminalSession'

interface TerminalContextValue {
  session: TerminalSession
  size: TerminalSize
}

const TerminalSessionContext = createContext<TerminalContextValue | undefined>(
  undefined
)

interface TerminalProviderProps {
  children: React.ReactNode
  session?: TerminalSession
}

/**
 * TerminalProvider wraps the terminal session and exposes size updates.
 * Single source of truth for terminal state in the app.
 */
export function TerminalProvider({
  children,
  session = new TerminalSession(),
}: TerminalProviderProps) {
  const [size, setSize] = useState(session.getSize())

  useEffect(() => {
    // Subscribe to resize events
    const unsubscribe = session.on('resize', (newSize: TerminalSize) => {
      setSize(newSize)
    })

    return unsubscribe
  }, [session])

  return (
    <TerminalSessionContext.Provider value={{ session, size }}>
      {children}
    </TerminalSessionContext.Provider>
  )
}

/**
 * Hook to access the terminal session and size.
 * Replaces reading from multiple hooks/contexts.
 */
export function useTerminal(): TerminalContextValue {
  const context = useContext(TerminalSessionContext)
  if (!context) {
    throw new Error('useTerminal must be used within TerminalProvider')
  }
  return context
}

/**
 * Hook to get only terminal size.
 * Replaces useSyncExternalStore for terminal size pattern.
 */
export function useTerminalSize(): TerminalSize {
  const { size } = useTerminal()
  return size
}
