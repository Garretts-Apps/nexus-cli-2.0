// Execution profiles replace the species/rarity model.
// Each profile represents a task-execution strategy derived from history.
export const EXECUTION_PROFILES = [
  'Methodical',
  'Creative',
  'Aggressive',
  'Balanced',
  'Analytical',
] as const
export type ExecutionProfile = (typeof EXECUTION_PROFILES)[number]

// Execution metrics replace the companion stat names (DEBUGGING, PATIENCE, etc.)
export const METRIC_NAMES = [
  'TASKS_COMPLETED',
  'AVG_RUNTIME_MS',
  'SUCCESS_RATE',
  'INSIGHT_DEPTH',
] as const
export type MetricName = (typeof METRIC_NAMES)[number]

// The deterministic core of a guide — derived from hash(userId + execution history).
// Never persisted; regenerated on every read so history changes take effect immediately.
export type ExecutionCore = {
  profile: ExecutionProfile
  metrics: Record<MetricName, number>
  philosophySeed: number
}

// The mutable portion stored in config after first activation.
export type StoredGuideState = {
  activatedAt: number
  executionPhilosophy: string
}

// Full resolved guide state used at runtime.
export type ContextGuide = ExecutionCore & StoredGuideState

// Thresholds for each metric (0–100 scale).
export const METRIC_DEFAULTS: Record<MetricName, number> = {
  TASKS_COMPLETED: 0,
  AVG_RUNTIME_MS: 0,
  SUCCESS_RATE: 100,
  INSIGHT_DEPTH: 50,
}

// Display labels for each metric.
export const METRIC_LABELS: Record<MetricName, string> = {
  TASKS_COMPLETED: 'Tasks Completed',
  AVG_RUNTIME_MS: 'Avg Runtime (ms)',
  SUCCESS_RATE: 'Success Rate (%)',
  INSIGHT_DEPTH: 'Insight Depth',
}

// Profile color mapping — keyed to theme tokens used in PromptInput footer.
export const PROFILE_COLORS: Record<
  ExecutionProfile,
  keyof import('../utils/theme.js').Theme
> = {
  Methodical: 'inactive',
  Creative: 'success',
  Aggressive: 'warning',
  Balanced: 'permission',
  Analytical: 'autoAccept',
}
