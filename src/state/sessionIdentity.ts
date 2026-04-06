// Tier 1 session identity state: session ID, parent session ID, cwd, project root,
// original cwd, and additional directories for CLAUDE.md loading.
// Extracted from src/bootstrap/state.ts (ARCH-002 Phase 4b).

import { realpathSync } from 'fs'
import { cwd } from 'process'
import type { SessionId } from 'src/types/ids.js'
// Indirection for browser-sdk build (package.json "browser" field swaps
// crypto.ts for crypto.browser.ts). Pure leaf re-export of node:crypto —
// zero circular-dep risk.
// eslint-disable-next-line custom-rules/bootstrap-isolation
import { randomUUID } from 'src/utils/crypto.js'
// eslint-disable-next-line custom-rules/bootstrap-isolation
import { createSignal } from 'src/utils/signal.js'
// eslint-disable-next-line custom-rules/bootstrap-isolation
import { setSessionProjectDir } from 'src/state/sessionConfig.js'

// ── Helpers ──

function resolveInitialCwd(): string {
  if (
    typeof process !== 'undefined' &&
    typeof process.cwd === 'function' &&
    typeof realpathSync === 'function'
  ) {
    const rawCwd = cwd()
    try {
      return realpathSync(rawCwd).normalize('NFC')
    } catch {
      // File Provider EPERM on CloudStorage mounts (lstat per path component).
      return rawCwd.normalize('NFC')
    }
  }
  return ''
}

// ── State ──

let sessionId: SessionId = randomUUID() as SessionId
let parentSessionId: SessionId | undefined = undefined
let originalCwd: string = resolveInitialCwd()
let projectRoot: string = originalCwd
let cwdState: string = originalCwd
let additionalDirectoriesForClaudeMd: string[] = []

// Plan slug cache lives here because regenerateSessionId/switchSession
// must delete the outgoing session's entry atomically with the ID change.
// plans.ts reads/writes via getPlanSlugCache().
const planSlugCache: Map<string, string> = new Map()

// ── Plan Slug Cache ──

export function getPlanSlugCache(): Map<string, string> {
  return planSlugCache
}

// ── Session ID ──

export function getSessionId(): SessionId {
  return sessionId
}

export function regenerateSessionId(
  options: { setCurrentAsParent?: boolean } = {},
): SessionId {
  if (options.setCurrentAsParent) {
    parentSessionId = sessionId
  }
  // Drop the outgoing session's plan-slug entry so the Map doesn't
  // accumulate stale keys. Callers that need to carry the slug across
  // (REPL.tsx clearContext) read it before calling clearConversation.
  planSlugCache.delete(sessionId)
  // Regenerated sessions live in the current project: reset projectDir to
  // null so getTranscriptPath() derives from originalCwd.
  sessionId = randomUUID() as SessionId
  setSessionProjectDir(null)
  return sessionId
}

export function getParentSessionId(): SessionId | undefined {
  return parentSessionId
}

/**
 * Atomically switch the active session. `sessionId` and `sessionProjectDir`
 * always change together — there is no separate setter for either, so they
 * cannot drift out of sync (CC-34).
 *
 * @param projectDir — directory containing `<sessionId>.jsonl`. Omit (or
 *   pass `null`) for sessions in the current project — the path will derive
 *   from originalCwd at read time. Pass `dirname(transcriptPath)` when the
 *   session lives in a different project directory (git worktrees,
 *   cross-project resume). Every call resets the project dir; it never
 *   carries over from the previous session.
 */
export function switchSession(
  id: SessionId,
  projectDir: string | null = null,
): void {
  // Drop the outgoing session's plan-slug entry so the Map stays bounded
  // across repeated /resume. Only the current session's slug is ever read
  // (plans.ts getPlanSlug defaults to getSessionId()).
  planSlugCache.delete(sessionId)
  sessionId = id
  setSessionProjectDir(projectDir)
  sessionSwitched.emit(id)
}

const sessionSwitched = createSignal<[id: SessionId]>()

/**
 * Register a callback that fires when switchSession changes the active
 * sessionId. bootstrap can't import listeners directly (DAG leaf), so
 * callers register themselves. concurrentSessions.ts uses this to keep the
 * PID file's sessionId in sync with --resume.
 */
export const onSessionSwitch = sessionSwitched.subscribe

// ── Original CWD ──

export function getOriginalCwd(): string {
  return originalCwd
}

export function setOriginalCwd(newCwd: string): void {
  originalCwd = newCwd.normalize('NFC')
}

// ── Project Root ──

/**
 * Get the stable project root directory.
 * Unlike getOriginalCwd(), this is never updated by mid-session EnterWorktreeTool
 * (so skills/history stay stable when entering a throwaway worktree).
 * It IS set at startup by --worktree, since that worktree is the session's project.
 * Use for project identity (history, skills, sessions) not file operations.
 */
export function getProjectRoot(): string {
  return projectRoot
}

/**
 * Only for --worktree startup flag. Mid-session EnterWorktreeTool must NOT
 * call this — skills/history should stay anchored to where the session started.
 */
export function setProjectRoot(newCwd: string): void {
  projectRoot = newCwd.normalize('NFC')
}

// ── CWD State ──

export function getCwdState(): string {
  return cwdState
}

export function setCwdState(newCwd: string): void {
  cwdState = newCwd.normalize('NFC')
}

// ── Additional Directories ──

export function getAdditionalDirectoriesForClaudeMd(): string[] {
  return additionalDirectoriesForClaudeMd
}

export function setAdditionalDirectoriesForClaudeMd(
  directories: string[],
): void {
  additionalDirectoriesForClaudeMd = directories
}

// ── Reset ──

/** Reset to initial state (test helper). */
export function resetSessionIdentityState(): void {
  const fresh = resolveInitialCwd()
  sessionId = randomUUID() as SessionId
  parentSessionId = undefined
  originalCwd = fresh
  projectRoot = fresh
  cwdState = fresh
  additionalDirectoriesForClaudeMd = []
  planSlugCache.clear()
  sessionSwitched.clear()
}
