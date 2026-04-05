/**
 * Module-level singleton for the ConnectionRegistry.
 *
 * Allows non-React code (e.g. refreshActivePlugins) to signal
 * plugin reload without going through AppState. The singleton is
 * set by useManageMCPConnections on mount and cleared on unmount.
 */

import type { ConnectionRegistry } from './ConnectionRegistry.js'

let _registry: ConnectionRegistry | null = null

/**
 * Set the active registry instance (called by useManageMCPConnections).
 */
export function setActiveRegistry(registry: ConnectionRegistry | null): void {
  _registry = registry
}

/**
 * Get the active registry instance.
 * Returns null if no registry is mounted (e.g. during tests or before REPL mount).
 */
export function getActiveRegistry(): ConnectionRegistry | null {
  return _registry
}

/**
 * Signal that all MCP connections should be re-initialized.
 *
 * Replaces the AppState mcp.pluginReconnectKey counter pattern.
 * Called by refreshActivePlugins() after plugin caches are cleared.
 * No-op if no registry is mounted.
 */
export function signalPluginReload(): void {
  _registry?.reloadAll()
}
