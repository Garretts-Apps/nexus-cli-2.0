/**
 * Slice Store infrastructure - replaces monolithic AppState with typed Slice<T> modules.
 *
 * Each domain (mcp, settings, permissions, ui) is a Slice<T> that declares its own
 * effects and state transitions. The global diff becomes a slim dispatcher that
 * iterates registered slices.
 */

import type { AppState } from '../AppState'

/**
 * Effect triggered when a slice's state changes and a condition is met.
 */
export interface SliceEffect<T> {
  /** Unique name for debugging and testing */
  readonly name: string
  /** Condition: when should this effect run? */
  when: (oldState: T, newState: T) => boolean
  /** Side effect to run when condition is true */
  run: (oldState: T, newState: T) => void
}

/**
 * A domain-specific state slice with effects.
 */
export interface Slice<T> {
  /** Unique key for this slice in AppState */
  readonly key: string
  /** Initial state value */
  readonly initialState: T
  /** Effects to run when state changes */
  readonly effects: SliceEffect<T>[]
  /** Extract this slice's state from AppState */
  select(appState: AppState): T
  /** Merge updated slice state back into AppState */
  merge(appState: AppState, newSliceState: T): AppState
}

/**
 * Create a typed Slice<T> with select/merge handlers.
 *
 * @example
 * ```ts
 * const mcpSlice = createSlice({
 *   key: 'mcp',
 *   initialState: {
 *     clients: [],
 *     tools: [],
 *   },
 *   select: (appState) => appState.mcp,
 *   merge: (appState, newMcpState) => ({
 *     ...appState,
 *     mcp: newMcpState,
 *   }),
 *   effects: [
 *     {
 *       name: 'log_tools_added',
 *       when: (old, new) => new.tools.length > old.tools.length,
 *       run: (old, new) => console.log(`Added ${new.tools.length - old.tools.length} tools`),
 *     },
 *   ],
 * })
 * ```
 */
export function createSlice<T>(config: {
  key: string
  initialState: T
  select: (appState: AppState) => T
  merge: (appState: AppState, newSliceState: T) => AppState
  effects?: SliceEffect<T>[]
}): Slice<T> {
  return {
    key: config.key,
    initialState: config.initialState,
    effects: config.effects ?? [],
    select: config.select,
    merge: config.merge,
  }
}
