import { ALL_SLICES } from './slice/registry.js'
import {
  permissionModeFromString,
} from '../utils/permissions/PermissionMode.js'
import {
  type SessionExternalMetadata,
} from '../utils/sessionState.js'
import type { AppState } from './AppStateStore.js'

// Inverse of the push below — restore on worker restart.
export function externalMetadataToAppState(
  metadata: SessionExternalMetadata,
): (prev: AppState) => AppState {
  return prev => ({
    ...prev,
    ...(typeof metadata.permission_mode === 'string'
      ? {
          toolPermissionContext: {
            ...prev.toolPermissionContext,
            mode: permissionModeFromString(metadata.permission_mode),
          },
        }
      : {}),
    ...(typeof metadata.is_remote_plan_mode === 'boolean'
      ? { isRemotePlanMode: metadata.is_remote_plan_mode }
      : {}),
  })
}

export function onChangeAppState({
  newState,
  oldState,
}: {
  newState: AppState
  oldState: AppState
}) {
  for (const slice of ALL_SLICES) {
    const oldSlice = slice.select(oldState)
    const newSlice = slice.select(newState)
    if (Object.is(oldSlice, newSlice)) continue
    for (const effect of slice.effects) {
      if (effect.when(oldSlice, newSlice)) {
        effect.run(oldSlice, newSlice)
      }
    }
  }
}
