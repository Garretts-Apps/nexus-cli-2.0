/**
 * UI state slice - expandedView, focus, overlays.
 */

import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import type { AppState } from '../AppStateStore.js'
import { createSlice, type SliceEffect } from './createSlice.js'

export interface UIState {
  expandedView?: 'tasks' | 'teammates'
  footerSelection?: string
  activeOverlays?: string[]
  verbose: boolean
  tungstenPanelVisible?: boolean
}

const effects: SliceEffect<UIState>[] = [
  {
    name: 'persist_expanded_view',
    when: (old, neu) => old.expandedView !== neu.expandedView,
    run: (old, neu) => {
      const showExpandedTodos = neu.expandedView === 'tasks'
      const showSpinnerTree = neu.expandedView === 'teammates'
      if (
        getGlobalConfig().showExpandedTodos !== showExpandedTodos ||
        getGlobalConfig().showSpinnerTree !== showSpinnerTree
      ) {
        saveGlobalConfig(current => ({
          ...current,
          showExpandedTodos,
          showSpinnerTree,
        }))
      }
    },
  },
  {
    name: 'persist_verbose',
    when: (old, neu) => old.verbose !== neu.verbose,
    run: (old, neu) => {
      if (getGlobalConfig().verbose !== neu.verbose) {
        const verbose = neu.verbose
        saveGlobalConfig(current => ({ ...current, verbose }))
      }
    },
  },
  {
    name: 'persist_tungsten_panel_visible',
    when: (old, neu) => old.tungstenPanelVisible !== neu.tungstenPanelVisible,
    run: (old, neu) => {
      if (process.env.INTERNAL_BUILD === '1') {
        if (
          neu.tungstenPanelVisible !== undefined &&
          getGlobalConfig().tungstenPanelVisible !== neu.tungstenPanelVisible
        ) {
          const tungstenPanelVisible = neu.tungstenPanelVisible
          saveGlobalConfig(current => ({ ...current, tungstenPanelVisible }))
        }
      }
    },
  },
]

export const uiSlice = createSlice<UIState>({
  key: 'ui',
  initialState: { verbose: false },
  select: (appState: AppState) => ({
    expandedView: appState.expandedView,
    footerSelection: appState.footerSelection,
    activeOverlays: appState.activeOverlays,
    verbose: appState.verbose,
    tungstenPanelVisible: appState.tungstenPanelVisible,
  }),
  merge: (appState: AppState, newState: UIState) => ({
    ...appState,
    expandedView: newState.expandedView,
    footerSelection: newState.footerSelection,
    activeOverlays: newState.activeOverlays,
    verbose: newState.verbose,
    tungstenPanelVisible: newState.tungstenPanelVisible,
  }),
  effects,
})

// Register slice in global registry for effect dispatch
import { registerSlice } from './registry.js'
registerSlice(uiSlice)
