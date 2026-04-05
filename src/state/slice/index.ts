/**
 * Slice Store - typed state management with composable effects.
 *
 * Replaces monolithic AppState + global diff with domain-specific slices
 * that own their state, effects, and transitions.
 */

export { createSlice, type Slice, type SliceEffect } from './createSlice.js'
export { watch, watchSlice } from './watch.js'
export { registerSlice, getRegisteredSlices, getSlice, clearSliceRegistry } from './registry.js'
