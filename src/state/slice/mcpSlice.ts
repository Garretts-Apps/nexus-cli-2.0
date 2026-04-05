import type { MCPServerConnection, ServerResource } from '../../services/mcp/types.js'
import type { Tool } from '../../Tool.js'
import type { Command } from '../../commands.js'
import type { AppState } from '../AppStateStore.js'
import { createSlice } from './createSlice.js'
import { registerSlice } from './registry.js'

export interface MCPState {
  clients: MCPServerConnection[]
  tools: Tool[]
  commands: Command[]
  resources: Record<string, ServerResource[]>
}

export const mcpSlice = createSlice<MCPState>({
  key: 'mcp',
  initialState: {
    clients: [],
    tools: [],
    commands: [],
    resources: {},
  },
  select: (appState: AppState) => appState.mcp,
  merge: (appState: AppState, newState: MCPState) => ({
    ...appState,
    mcp: newState,
  }),
  effects: [
    // MCP slice has no effects — consumers subscribe via watch()
  ],
})

// Register slice in global registry for effect dispatch
registerSlice(mcpSlice)
