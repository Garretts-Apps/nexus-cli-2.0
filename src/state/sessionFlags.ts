// Session flags state: boolean session flags, mode transitions, interactive state,
// agent color map, and third-party auth preference.
// Extracted from src/bootstrap/state.ts (ARCH-002 Phase 4b, Step 3).

import type { AgentColorName } from 'src/tools/AgentTool/agentColorManager.js'
// eslint-disable-next-line custom-rules/bootstrap-isolation
import { getClientType } from 'src/state/sessionConfig.js'

// ── State ──

let isInteractive = false
let sessionBypassPermissionsMode = false
let sessionTrustAccepted = false
let sessionPersistenceDisabled = false
let hasExitedPlanMode = false
let needsPlanModeExitAttachmentFlag = false
let needsAutoModeExitAttachmentFlag = false
let lspRecommendationShownThisSession = false
const agentColorMap: Map<string, AgentColorName> = new Map()
let agentColorIndex = 0

// ── Interactive state ──

export function getIsInteractive(): boolean {
  return isInteractive
}

export function setIsInteractive(value: boolean): void {
  isInteractive = value
}

export function getIsNonInteractiveSession(): boolean {
  return !isInteractive
}

// ── Third-party auth preference ──

export function preferThirdPartyAuthentication(): boolean {
  // IDE extension should behave as 1P for authentication reasons.
  return getIsNonInteractiveSession() && getClientType() !== 'claude-vscode'
}

// ── Agent color map ──

export function getAgentColorMap(): Map<string, AgentColorName> {
  return agentColorMap
}

export function getAgentColorIndex(): number {
  return agentColorIndex
}

export function incrementAgentColorIndex(): void {
  agentColorIndex++
}

// ── Session bypass permissions mode ──

export function setSessionBypassPermissionsMode(enabled: boolean): void {
  sessionBypassPermissionsMode = enabled
}

export function getSessionBypassPermissionsMode(): boolean {
  return sessionBypassPermissionsMode
}

// ── Session trust accepted ──

export function setSessionTrustAccepted(accepted: boolean): void {
  sessionTrustAccepted = accepted
}

export function getSessionTrustAccepted(): boolean {
  return sessionTrustAccepted
}

// ── Session persistence disabled ──

export function setSessionPersistenceDisabled(disabled: boolean): void {
  sessionPersistenceDisabled = disabled
}

export function isSessionPersistenceDisabled(): boolean {
  return sessionPersistenceDisabled
}

// ── Plan mode exit tracking ──

export function hasExitedPlanModeInSession(): boolean {
  return hasExitedPlanMode
}

export function setHasExitedPlanMode(value: boolean): void {
  hasExitedPlanMode = value
}

export function needsPlanModeExitAttachment(): boolean {
  return needsPlanModeExitAttachmentFlag
}

export function setNeedsPlanModeExitAttachment(value: boolean): void {
  needsPlanModeExitAttachmentFlag = value
}

export function handlePlanModeTransition(
  fromMode: string,
  toMode: string,
): void {
  // If switching TO plan mode, clear any pending exit attachment
  // This prevents sending both plan_mode and plan_mode_exit when user toggles quickly
  if (toMode === 'plan' && fromMode !== 'plan') {
    needsPlanModeExitAttachmentFlag = false
  }

  // If switching out of plan mode, trigger the plan_mode_exit attachment
  if (fromMode === 'plan' && toMode !== 'plan') {
    needsPlanModeExitAttachmentFlag = true
  }
}

// ── Auto mode exit tracking ──

export function needsAutoModeExitAttachment(): boolean {
  return needsAutoModeExitAttachmentFlag
}

export function setNeedsAutoModeExitAttachment(value: boolean): void {
  needsAutoModeExitAttachmentFlag = value
}

export function handleAutoModeTransition(
  fromMode: string,
  toMode: string,
): void {
  // Auto↔plan transitions are handled by prepareContextForPlanMode (auto may
  // stay active through plan if opted in) and ExitPlanMode (restores mode).
  // Skip both directions so this function only handles direct auto transitions.
  if (
    (fromMode === 'auto' && toMode === 'plan') ||
    (fromMode === 'plan' && toMode === 'auto')
  ) {
    return
  }
  const fromIsAuto = fromMode === 'auto'
  const toIsAuto = toMode === 'auto'

  // If switching TO auto mode, clear any pending exit attachment
  // This prevents sending both auto_mode and auto_mode_exit when user toggles quickly
  if (toIsAuto && !fromIsAuto) {
    needsAutoModeExitAttachmentFlag = false
  }

  // If switching out of auto mode, trigger the auto_mode_exit attachment
  if (fromIsAuto && !toIsAuto) {
    needsAutoModeExitAttachmentFlag = true
  }
}

// ── LSP recommendation session tracking ──

export function hasShownLspRecommendationThisSession(): boolean {
  return lspRecommendationShownThisSession
}

export function setLspRecommendationShownThisSession(value: boolean): void {
  lspRecommendationShownThisSession = value
}

// ── Test reset ──

export function resetSessionFlagsState(): void {
  isInteractive = false
  sessionBypassPermissionsMode = false
  sessionTrustAccepted = false
  sessionPersistenceDisabled = false
  hasExitedPlanMode = false
  needsPlanModeExitAttachmentFlag = false
  needsAutoModeExitAttachmentFlag = false
  lspRecommendationShownThisSession = false
  agentColorMap.clear()
  agentColorIndex = 0
}
