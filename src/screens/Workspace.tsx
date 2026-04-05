// Phase 2: Thin wrapper around REPL.tsx
// Delegates to REPL, behavior identical
import React from 'react'
import { REPL } from './REPL.js'
import type { Props as REPLProps } from './REPL.js'

export type WorkspaceProps = REPLProps

export function Workspace(props: WorkspaceProps): React.ReactElement {
  return <REPL {...props} />
}
