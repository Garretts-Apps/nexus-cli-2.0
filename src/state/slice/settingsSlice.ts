import type { AppState } from '../AppStateStore.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import { createSlice } from './createSlice.js'

export const settingsSlice = createSlice<SettingsJson>({
  key: 'settings',
  initialState: {} as SettingsJson,
  select: (appState: AppState) => appState.settings,
  merge: (appState: AppState, newState: SettingsJson) => ({
    ...appState,
    settings: newState,
  }),
  effects: [
    // Settings effects are handled in onChangeAppState for backward compatibility.
    // Phase 3 will migrate them here incrementally.
  ],
})
