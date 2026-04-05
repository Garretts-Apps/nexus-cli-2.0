import type { AppState } from '../AppStateStore.js'
import type { ToolPermissionContext } from '../../Tool.js'
import type { DenialTrackingState } from '../../utils/permissions/denialTracking.js'
import { createSlice, type SliceEffect } from './createSlice.js'
import {
  toExternalPermissionMode,
} from '../../utils/permissions/PermissionMode.js'
import {
  notifyPermissionModeChanged,
  notifySessionMetadataChanged,
} from '../../utils/sessionState.js'

export interface PermissionsState {
  toolPermissionContext: ToolPermissionContext
  denialTracking: DenialTrackingState | undefined
  isRemotePlanMode?: boolean
}

const effects: SliceEffect<PermissionsState>[] = [
  {
    name: 'sync_permission_mode',
    when: (old, neu) =>
      old.toolPermissionContext.mode !== neu.toolPermissionContext.mode,
    run: (old, neu) => {
      const prevMode = old.toolPermissionContext.mode
      const newMode = neu.toolPermissionContext.mode
      const prevExternal = toExternalPermissionMode(prevMode)
      const newExternal = toExternalPermissionMode(newMode)
      if (prevExternal !== newExternal) {
        // Ultraplan = first plan cycle only.
        const isUltraplan =
          newExternal === 'plan' &&
          neu.isRemotePlanMode === true &&
          old.isRemotePlanMode !== true
            ? true
            : null
        notifySessionMetadataChanged({
          permission_mode: newExternal,
          is_remote_plan_mode: isUltraplan,
        })
      }
      notifyPermissionModeChanged(newMode)
    },
  },
  {
    name: 'sync_remote_plan_mode_metadata',
    when: (old, neu) =>
      old.toolPermissionContext.mode === neu.toolPermissionContext.mode &&
      old.isRemotePlanMode !== neu.isRemotePlanMode,
    run: (old, neu) => {
      const newExternal = toExternalPermissionMode(neu.toolPermissionContext.mode)
      const isUltraplan =
        newExternal === 'plan' &&
        neu.isRemotePlanMode === true &&
        old.isRemotePlanMode !== true
          ? true
          : null
      if (isUltraplan !== null) {
        notifySessionMetadataChanged({
          permission_mode: newExternal,
          is_remote_plan_mode: isUltraplan,
        })
      }
    },
  },
]

export const permissionsSlice = createSlice<PermissionsState>({
  key: 'permissions',
  initialState: {
    toolPermissionContext: {
      mode: 'default',
      toolStates: {},
    } as ToolPermissionContext,
    denialTracking: undefined,
    isRemotePlanMode: undefined,
  },
  select: (appState: AppState) => ({
    toolPermissionContext: appState.toolPermissionContext,
    denialTracking: appState.denialTracking,
    isRemotePlanMode: appState.isRemotePlanMode,
  }),
  merge: (appState: AppState, newState: PermissionsState) => ({
    ...appState,
    toolPermissionContext: newState.toolPermissionContext,
    denialTracking: newState.denialTracking,
    isRemotePlanMode: newState.isRemotePlanMode,
  }),
  effects,
})

// Register slice in global registry for effect dispatch
import { registerSlice } from './registry.js'
registerSlice(permissionsSlice)
