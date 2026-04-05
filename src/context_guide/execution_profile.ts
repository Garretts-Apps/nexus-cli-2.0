import { getGlobalConfig } from '../utils/config.js'
import {
  type ContextGuide,
  type ExecutionCore,
  type ExecutionProfile,
  EXECUTION_PROFILES,
  METRIC_NAMES,
  type MetricName,
  type StoredGuideState,
} from './types.js'

// Mulberry32 — deterministic seeded PRNG
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

// Derive execution metrics deterministically from the seed.
// Values are 0–100 normalized scores.
function deriveMetrics(rng: () => number): Record<MetricName, number> {
  const metrics = {} as Record<MetricName, number>
  for (const name of METRIC_NAMES) {
    metrics[name] = Math.floor(rng() * 100)
  }
  return metrics
}

const PROFILE_SALT = 'context-guide-2026-401'

export type ProfileRoll = {
  core: ExecutionCore
}

function rollFrom(rng: () => number): ProfileRoll {
  const profile: ExecutionProfile = pick(rng, EXECUTION_PROFILES)
  const metrics = deriveMetrics(rng)
  const philosophySeed = Math.floor(rng() * 1e9)
  return {
    core: { profile, metrics, philosophySeed },
  }
}

// Cache: same userId + salt yields the same core every call.
let rollCache: { key: string; value: ProfileRoll } | undefined

export function rollProfile(userId: string): ProfileRoll {
  const key = userId + PROFILE_SALT
  if (rollCache?.key === key) return rollCache.value
  const value = rollFrom(mulberry32(hashString(key)))
  rollCache = { key, value }
  return value
}

export function contextGuideUserId(): string {
  const config = getGlobalConfig()
  return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'
}

// Merge stored state with freshly derived core.
// The core is never persisted — it regenerates from userId so stored state
// can't be edited to fake a profile.
export function getContextGuide(): ContextGuide | undefined {
  const stored = getGlobalConfig().contextGuide as StoredGuideState | undefined
  if (!stored) return undefined
  const { core } = rollProfile(contextGuideUserId())
  return { ...stored, ...core }
}
