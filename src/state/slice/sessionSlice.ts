import type { AppState } from '../AppStateStore.js'
import type { ModelSetting } from '../../utils/model/model.js'
import { createSlice } from './createSlice.js'

export interface SessionState {
  mainLoopModel: ModelSetting
  mainLoopModelForSession: ModelSetting
  authVersion: number
  assistantModeEnabled: boolean
}

export const sessionSlice = createSlice<SessionState>({
  key: 'session',
  initialState: {
    mainLoopModel: null,
    mainLoopModelForSession: null,
    authVersion: 0,
    assistantModeEnabled: false,
  },
  select: (appState: AppState) => ({
    mainLoopModel: appState.mainLoopModel,
    mainLoopModelForSession: appState.mainLoopModelForSession,
    authVersion: appState.authVersion,
    assistantModeEnabled: appState.assistantModeEnabled,
  }),
  merge: (appState: AppState, newState: SessionState) => ({
    ...appState,
    mainLoopModel: newState.mainLoopModel,
    mainLoopModelForSession: newState.mainLoopModelForSession,
    authVersion: newState.authVersion,
    assistantModeEnabled: newState.assistantModeEnabled,
  }),
  effects: [
    // Model override effects are handled in onChangeAppState for backward compatibility.
    // Phase 3 will migrate them here incrementally.
  ],
})
