import type { AppState, FooterItem } from '../AppStateStore.js'
import { createSlice } from './createSlice.js'

export interface UIState {
  expandedView: 'none' | 'tasks' | 'teammates'
  isBriefOnly: boolean
  footerSelection: FooterItem | null
  activeOverlays: ReadonlySet<string>
  spinnerTip: string | undefined
  statusLineText: string | undefined
  verbose: boolean
}

export const uiSlice = createSlice<UIState>({
  key: 'ui',
  initialState: {
    expandedView: 'none',
    isBriefOnly: false,
    footerSelection: null,
    activeOverlays: new Set<string>(),
    spinnerTip: undefined,
    statusLineText: undefined,
    verbose: false,
  },
  select: (appState: AppState) => ({
    expandedView: appState.expandedView,
    isBriefOnly: appState.isBriefOnly,
    footerSelection: appState.footerSelection,
    activeOverlays: appState.activeOverlays,
    spinnerTip: appState.spinnerTip,
    statusLineText: appState.statusLineText,
    verbose: appState.verbose,
  }),
  merge: (appState: AppState, newState: UIState) => ({
    ...appState,
    expandedView: newState.expandedView,
    isBriefOnly: newState.isBriefOnly,
    footerSelection: newState.footerSelection,
    activeOverlays: newState.activeOverlays,
    spinnerTip: newState.spinnerTip,
    statusLineText: newState.statusLineText,
    verbose: newState.verbose,
  }),
  effects: [
    // UI persistence effects (expandedView, verbose) are handled in onChangeAppState.
    // Phase 3 will migrate them here incrementally.
  ],
})
