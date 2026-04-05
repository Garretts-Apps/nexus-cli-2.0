/**
 * Settings state slice - user configuration.
 */

import type { AppState } from '../AppStateStore.js'
import { createSlice, type SliceEffect } from './createSlice.js'
import {
  clearApiKeyHelperCache,
  clearAwsCredentialsCache,
  clearGcpCredentialsCache,
} from '../../utils/auth.js'
import { applyConfigEnvironmentVariables } from '../../utils/managedEnv.js'
import { logError } from '../../utils/log.js'
import { toError } from '../../utils/errors.js'
import type { SettingsJson } from '../../utils/settings/types.js'

const effects: SliceEffect<SettingsJson>[] = [
  {
    name: 'clear_auth_caches_on_settings_change',
    when: (old, neu) => old !== neu,
    run: () => {
      try {
        clearApiKeyHelperCache()
        clearAwsCredentialsCache()
        clearGcpCredentialsCache()
      } catch (error) {
        logError(toError(error))
      }
    },
  },
  {
    name: 'apply_env_vars_on_env_change',
    when: (old, neu) => old.env !== neu.env,
    run: () => {
      try {
        applyConfigEnvironmentVariables()
      } catch (error) {
        logError(toError(error))
      }
    },
  },
]

export const settingsSlice = createSlice<SettingsJson>({
  key: 'settings',
  initialState: {} as SettingsJson,
  select: (appState: AppState) => appState.settings,
  merge: (appState: AppState, newState: SettingsJson) => ({
    ...appState,
    settings: newState,
  }),
  effects,
})

// Register slice in global registry for effect dispatch
import { registerSlice } from './registry.js'
registerSlice(settingsSlice)
