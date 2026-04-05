import type { AppState } from '../AppStateStore.js'

export interface SliceEffect<T> {
  readonly name: string
  when(oldState: T, newState: T): boolean
  run(oldState: T, newState: T): void
}

export interface Slice<T> {
  readonly key: string
  readonly initialState: T
  readonly effects: readonly SliceEffect<T>[]
  select(appState: AppState): T
  merge(appState: AppState, newSliceState: T): AppState
}

export interface SliceConfig<T> {
  key: string
  initialState: T
  select: (appState: AppState) => T
  merge: (appState: AppState, newSliceState: T) => AppState
  effects?: SliceEffect<T>[]
}

export function createSlice<T>(config: SliceConfig<T>): Slice<T> {
  return {
    key: config.key,
    initialState: config.initialState,
    effects: config.effects ?? [],
    select: config.select,
    merge: config.merge,
  }
}
