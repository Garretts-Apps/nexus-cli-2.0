/**
 * Cross-slice subscription helpers.
 *
 * Allows components to watch multiple slices and react when specific
 * combinations of slice state change.
 */

import type { Store } from '../store'
import type { AppState } from '../AppState'
import type { Slice } from './createSlice'

/**
 * Watch two slices and call a callback when either changes.
 *
 * Useful for handling side effects that depend on multiple slices.
 *
 * @example
 * ```ts
 * const unsubscribe = watch(
 *   store,
 *   mcpSlice,
 *   settingsSlice,
 *   (mcp, settings) => {
 *     if (mcp.clients.length > 0 && settings.verbose) {
 *       console.log('MCP active:', mcp.clients)
 *     }
 *   }
 * )
 * ```
 */
export function watch<A, B>(
  store: Store<AppState>,
  sliceA: Slice<A>,
  sliceB: Slice<B>,
  fn: (stateA: A, stateB: B) => void
): () => void {
  let lastA = sliceA.select(store.getState())
  let lastB = sliceB.select(store.getState())

  const unsubscribe = store.subscribe((state) => {
    const newA = sliceA.select(state)
    const newB = sliceB.select(state)

    // Call only if at least one slice changed
    if (!Object.is(newA, lastA) || !Object.is(newB, lastB)) {
      lastA = newA
      lastB = newB
      fn(newA, newB)
    }
  })

  return unsubscribe
}

/**
 * Watch a single slice for changes.
 *
 * @example
 * ```ts
 * const unsubscribe = watchSlice(store, mcpSlice, (mcp) => {
 *   console.log('MCP state changed:', mcp)
 * })
 * ```
 */
export function watchSlice<T>(
  store: Store<AppState>,
  slice: Slice<T>,
  fn: (state: T) => void
): () => void {
  let last = slice.select(store.getState())

  const unsubscribe = store.subscribe((state) => {
    const next = slice.select(state)
    if (!Object.is(next, last)) {
      last = next
      fn(next)
    }
  })

  return unsubscribe
}
