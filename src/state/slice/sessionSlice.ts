import type { AppState } from '../AppStateStore.js'
import type { ModelSetting } from '../../utils/model/model.js'
import { createSlice, type SliceEffect } from './createSlice.js'
import { setMainLoopModelOverride } from '../sessionConfig.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

export interface SessionState {
  mainLoopModel: ModelSetting
  mainLoopModelForSession: ModelSetting
  authVersion: number
  assistantModeEnabled: boolean
}

const effects: SliceEffect<SessionState>[] = [
  {
    name: 'persist_main_loop_model',
    when: (old, neu) => old.mainLoopModel !== neu.mainLoopModel,
    run: (old, neu) => {
      if (neu.mainLoopModel === null) {
        updateSettingsForSource('userSettings', { model: undefined })
        setMainLoopModelOverride(null)
      } else {
        updateSettingsForSource('userSettings', { model: neu.mainLoopModel })
        setMainLoopModelOverride(neu.mainLoopModel)
      }
    },
  },
]

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
  effects,
})

// Register slice in global registry for effect dispatch
import { registerSlice } from './registry.js'
registerSlice(sessionSlice)
