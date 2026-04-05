/**
 * BackoffStrategy implementations.
 *
 * Decouples backoff timing logic from the retry engine.
 * Allows exponential, linear, and custom backoff strategies.
 */

import { NEXUS_UNATTENDED_RETRY } from './env'

export const BASE_DELAY_MS = 500
const PERSISTENT_MAX_BACKOFF_MS = 5 * 60 * 1000
const PERSISTENT_RESET_CAP_MS = 6 * 60 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 30_000

export interface BackoffStrategy {
  /**
   * Calculate delay in milliseconds for the given attempt number.
   */
  getDelay(attempt: number): number
}

/**
 * Exponential backoff with jitter.
 * Commonly used for rate limiting and transient errors.
 */
export class ExponentialBackoff implements BackoffStrategy {
  constructor(
    private baseDelay: number = BASE_DELAY_MS,
    private maxDelay: number = 30000
  ) {}

  getDelay(attempt: number): number {
    // Exponential: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt)
    const capped = Math.min(exponentialDelay, this.maxDelay)
    // Add jitter: random 0-10% of delay
    const jitter = capped * (Math.random() * 0.1)
    return capped + jitter
  }
}

/**
 * Linear backoff strategy.
 * Simple and predictable, increases by fixed increment per attempt.
 */
export class LinearBackoff implements BackoffStrategy {
  constructor(
    private baseDelay: number = BASE_DELAY_MS,
    private increment: number = BASE_DELAY_MS,
    private maxDelay: number = 30000
  ) {}

  getDelay(attempt: number): number {
    const delay = this.baseDelay + this.increment * attempt
    return Math.min(delay, this.maxDelay)
  }
}

/**
 * Persistent backoff strategy with longer delays and heartbeats.
 *
 * Used for unattended sessions that retry indefinitely.
 * Includes longer max backoff and periodic heartbeat yields.
 */
export class PersistentBackoff implements BackoffStrategy {
  private sessionStartTime: number = Date.now()

  constructor(private baseDelay: number = BASE_DELAY_MS) {}

  getDelay(attempt: number): number {
    if (!NEXUS_UNATTENDED_RETRY) {
      // Fall back to exponential if not in persistent mode
      return new ExponentialBackoff(this.baseDelay).getDelay(attempt)
    }

    // Exponential backoff but with much higher cap
    const exponentialDelay = this.baseDelay * Math.pow(2, Math.min(attempt, 10))
    const capped = Math.min(exponentialDelay, PERSISTENT_MAX_BACKOFF_MS)

    // Reset cap every 6 hours to prevent infinite waits
    const elapsedSinceStart = Date.now() - this.sessionStartTime
    if (elapsedSinceStart > PERSISTENT_RESET_CAP_MS) {
      this.sessionStartTime = Date.now()
    }

    return capped
  }

  /**
   * Get heartbeat interval for keep-alive yields.
   * Prevents the host from marking the session as idle.
   */
  getHeartbeatInterval(): number {
    return HEARTBEAT_INTERVAL_MS
  }
}

/**
 * Get the appropriate backoff strategy based on environment.
 */
export function createBackoffStrategy(): BackoffStrategy {
  if (NEXUS_UNATTENDED_RETRY) {
    return new PersistentBackoff(BASE_DELAY_MS)
  }
  return new ExponentialBackoff(BASE_DELAY_MS)
}
