/**
 * Nexus Connection Registry - FSM-based MCP connection management.
 *
 * Replaces discriminated union pattern with explicit state machine,
 * eliminating invalid state transitions and improving type safety.
 */

export { type ConnectionState, ConnectionFSM } from './ConnectionFSM.js'
export { type ResolvedTool, ToolRouter } from './ToolRouter.js'
export { type RegistryEventType, type RegistryEvent, type RegistryEventHandler } from './RegistryEvents.js'
export { ConnectionRegistry, type RegistryEntry } from './ConnectionRegistry.js'
export { setActiveRegistry, getActiveRegistry, signalPluginReload } from './registrySingleton.js'
