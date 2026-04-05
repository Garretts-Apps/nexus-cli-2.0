import type { AppState } from '../AppStateStore.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'
import type { Command } from '../../commands.js'
import { createSlice } from './createSlice.js'

export interface PluginsState {
  enabled: LoadedPlugin[]
  disabled: LoadedPlugin[]
  commands: Command[]
  errors: PluginError[]
  installationStatus: {
    marketplaces: Array<{
      name: string
      status: 'pending' | 'installing' | 'installed' | 'failed'
      error?: string
    }>
    plugins: Array<{
      id: string
      name: string
      status: 'pending' | 'installing' | 'installed' | 'failed'
      error?: string
    }>
  }
  needsRefresh: boolean
}

export const pluginsSlice = createSlice<PluginsState>({
  key: 'plugins',
  initialState: {
    enabled: [],
    disabled: [],
    commands: [],
    errors: [],
    installationStatus: {
      marketplaces: [],
      plugins: [],
    },
    needsRefresh: false,
  },
  select: (appState: AppState) => appState.plugins,
  merge: (appState: AppState, newState: PluginsState) => ({
    ...appState,
    plugins: newState,
  }),
  effects: [
    // Plugin reload effects handled externally via watch() or onChangeAppState.
  ],
})
