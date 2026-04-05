/**
 * Slice registry - central collection of all domain slices.
 *
 * Used by onChangeAppState dispatcher to iterate slices and run their effects.
 * Slices register themselves here on module load.
 */

import type { Slice } from './createSlice'

/**
 * Registry of all active slices.
 * Populated by individual slice modules on import.
 */
const slices = new Map<string, Slice<any>>()

/**
 * Register a slice in the global registry.
 * Called automatically by slice definitions.
 */
export function registerSlice<T>(slice: Slice<T>): void {
  if (slices.has(slice.key)) {
    console.warn(`Slice with key "${slice.key}" is already registered`)
    return
  }
  slices.set(slice.key, slice)
}

/**
 * Get all registered slices.
 * Used by onChangeAppState to dispatch state changes.
 */
export function getRegisteredSlices(): Slice<any>[] {
  return Array.from(slices.values())
}

/**
 * Get a specific slice by key.
 * Useful for testing and debugging.
 */
export function getSlice<T>(key: string): Slice<T> | undefined {
  return slices.get(key) as Slice<T> | undefined
}

/**
 * Clear all registered slices.
 * Used for testing and resets.
 */
export function clearSliceRegistry(): void {
  slices.clear()
}

/**
 * ALL_SLICES - exported for compatibility with onChangeAppState.
 *
 * This is a getter that returns the current list of registered slices.
 * Used by the slice effect dispatcher in onChangeAppState.
 */
export const ALL_SLICES = getRegisteredSlices()
