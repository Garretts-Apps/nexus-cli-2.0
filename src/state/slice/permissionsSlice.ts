import type { AppState } from '../AppStateStore.js'
import type { ToolPermissionContext } from '../../Tool.js'
import type { DenialTrackingState } from '../../utils/permissions/denialTracking.js'
import { createSlice } from './createSlice.js'

export interface PermissionsState {
  toolPermissionContext: ToolPermissionContext
  denialTracking: DenialTrackingState | undefined
}

export const permissionsSlice = createSlice<PermissionsState>({
  key: 'permissions',
  initialState: {
    toolPermissionContext: {
      mode: 'default',
      toolStates: {},
    } as ToolPermissionContext,
    denialTracking: undefined,
  },
  select: (appState: AppState) => ({
    toolPermissionContext: appState.toolPermissionContext,
    denialTracking: appState.denialTracking,
  }),
  merge: (appState: AppState, newState: PermissionsState) => ({
    ...appState,
    toolPermissionContext: newState.toolPermissionContext,
    denialTracking: newState.denialTracking,
  }),
  effects: [
    // Permission mode sync effects are handled in onChangeAppState for backward compatibility.
    // Phase 3 will migrate them here incrementally.
  ],
})
