import type { Store } from '../store.js'
import type { AppState } from '../AppStateStore.js'
import type { Slice } from './createSlice.js'

export function watch<A, B>(
  store: Store<AppState>,
  sliceA: Slice<A>,
  sliceB: Slice<B>,
  fn: (stateA: A, stateB: B) => void
): () => void {
  let prevA = sliceA.select(store.getState())
  let prevB = sliceB.select(store.getState())

  const unsubscribe = store.subscribe(() => {
    const state = store.getState()
    const nextA = sliceA.select(state)
    const nextB = sliceB.select(state)

    const aChanged = !Object.is(prevA, nextA)
    const bChanged = !Object.is(prevB, nextB)

    if (aChanged || bChanged) {
      fn(nextA, nextB)
      prevA = nextA
      prevB = nextB
    }
  })

  return unsubscribe
}
