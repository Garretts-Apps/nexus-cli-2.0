import { mcpSlice } from './mcpSlice.js'
import { settingsSlice } from './settingsSlice.js'
import { permissionsSlice } from './permissionsSlice.js'
import { uiSlice } from './uiSlice.js'
import { sessionSlice } from './sessionSlice.js'
import { pluginsSlice } from './pluginsSlice.js'
import type { Slice } from './createSlice.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_SLICES: readonly Slice<any>[] = [
  mcpSlice,
  settingsSlice,
  permissionsSlice,
  uiSlice,
  sessionSlice,
  pluginsSlice,
]

export function getSliceByKey<T = unknown>(key: string): Slice<T> | undefined {
  return ALL_SLICES.find(s => s.key === key) as Slice<T> | undefined
}
