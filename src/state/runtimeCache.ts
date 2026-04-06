// Runtime cache state: in-memory error log, teleported session info,
// slow operations, system prompt section cache, last emitted date,
// prompt ID, and API request/completion tracking.
// Extracted from src/bootstrap/state.ts (ARCH-002 Phase 4b, Step 4).

// ── State ──

let inMemoryErrorLog: Array<{ error: string; timestamp: string }> = []

let teleportedSessionInfo: {
  isTeleported: boolean
  hasLoggedFirstMessage: boolean
  sessionId: string | null
} | null = null

let slowOperations: Array<{
  operation: string
  durationMs: number
  timestamp: number
}> = []

let systemPromptSectionCache: Map<string, string | null> = new Map()

let lastEmittedDate: string | null = null

let promptId: string | null = null

let lastMainRequestId: string | undefined = undefined

let lastApiCompletionTimestamp: number | null = null

// ── In-memory error log ──

export function addToInMemoryErrorLog(errorInfo: {
  error: string
  timestamp: string
}): void {
  const MAX_IN_MEMORY_ERRORS = 100
  if (inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    inMemoryErrorLog.shift() // Remove oldest error
  }
  inMemoryErrorLog.push(errorInfo)
}

export function getInMemoryErrorLog(): ReadonlyArray<{
  error: string
  timestamp: string
}> {
  return inMemoryErrorLog
}

// ── Teleported session info ──

export function setTeleportedSessionInfo(info: {
  sessionId: string | null
}): void {
  teleportedSessionInfo = {
    isTeleported: true,
    hasLoggedFirstMessage: false,
    sessionId: info.sessionId,
  }
}

export function getTeleportedSessionInfo(): {
  isTeleported: boolean
  hasLoggedFirstMessage: boolean
  sessionId: string | null
} | null {
  return teleportedSessionInfo
}

export function markFirstTeleportMessageLogged(): void {
  if (teleportedSessionInfo) {
    teleportedSessionInfo.hasLoggedFirstMessage = true
  }
}

// ── Slow operations tracking for dev bar ──

const MAX_SLOW_OPERATIONS = 10
const SLOW_OPERATION_TTL_MS = 10000

export function addSlowOperation(operation: string, durationMs: number): void {
  if (process.env.INTERNAL_BUILD !== '1') return
  // Skip tracking for editor sessions (user editing a prompt file in $EDITOR)
  // These are intentionally slow since the user is drafting text
  if (operation.includes('exec') && operation.includes('claude-prompt-')) {
    return
  }
  const now = Date.now()
  // Remove stale operations
  slowOperations = slowOperations.filter(
    op => now - op.timestamp < SLOW_OPERATION_TTL_MS,
  )
  // Add new operation
  slowOperations.push({ operation, durationMs, timestamp: now })
  // Keep only the most recent operations
  if (slowOperations.length > MAX_SLOW_OPERATIONS) {
    slowOperations = slowOperations.slice(-MAX_SLOW_OPERATIONS)
  }
}

const EMPTY_SLOW_OPERATIONS: ReadonlyArray<{
  operation: string
  durationMs: number
  timestamp: number
}> = []

export function getSlowOperations(): ReadonlyArray<{
  operation: string
  durationMs: number
  timestamp: number
}> {
  // Most common case: nothing tracked. Return a stable reference so the
  // caller's setState() can bail via Object.is instead of re-rendering at 2fps.
  if (slowOperations.length === 0) {
    return EMPTY_SLOW_OPERATIONS
  }
  const now = Date.now()
  // Only allocate a new array when something actually expired; otherwise keep
  // the reference stable across polls while ops are still fresh.
  if (
    slowOperations.some(op => now - op.timestamp >= SLOW_OPERATION_TTL_MS)
  ) {
    slowOperations = slowOperations.filter(
      op => now - op.timestamp < SLOW_OPERATION_TTL_MS,
    )
    if (slowOperations.length === 0) {
      return EMPTY_SLOW_OPERATIONS
    }
  }
  // Safe to return directly: addSlowOperation() reassigns slowOperations
  // before pushing, so the array held in React state is never mutated.
  return slowOperations
}

// ── System prompt section cache ──

export function getSystemPromptSectionCache(): Map<string, string | null> {
  return systemPromptSectionCache
}

export function setSystemPromptSectionCacheEntry(
  name: string,
  value: string | null,
): void {
  systemPromptSectionCache.set(name, value)
}

export function clearSystemPromptSectionState(): void {
  systemPromptSectionCache.clear()
}

// ── Last emitted date ──

export function getLastEmittedDate(): string | null {
  return lastEmittedDate
}

export function setLastEmittedDate(date: string | null): void {
  lastEmittedDate = date
}

// ── Prompt ID ──

export function getPromptId(): string | null {
  return promptId
}

export function setPromptId(id: string | null): void {
  promptId = id
}

// ── Last main request ID ──

export function getLastMainRequestId(): string | undefined {
  return lastMainRequestId
}

export function setLastMainRequestId(requestId: string): void {
  lastMainRequestId = requestId
}

// ── Last API completion timestamp ──

export function getLastApiCompletionTimestamp(): number | null {
  return lastApiCompletionTimestamp
}

export function setLastApiCompletionTimestamp(timestamp: number): void {
  lastApiCompletionTimestamp = timestamp
}

// ── Test reset ──

export function resetRuntimeCacheState(): void {
  inMemoryErrorLog = []
  teleportedSessionInfo = null
  slowOperations = []
  systemPromptSectionCache = new Map()
  lastEmittedDate = null
  promptId = null
  lastMainRequestId = undefined
  lastApiCompletionTimestamp = null
}
