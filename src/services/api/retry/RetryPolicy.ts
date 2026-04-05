/**
 * RetryPolicy interface and implementations.
 *
 * Decouples retry decision logic from the retry engine.
 * Allows different strategies (exponential, linear, persistent) to be composed.
 */

import type { APIError } from '../types'
import { NEXUS_UNATTENDED_RETRY } from './env'

export interface RetryPolicy {
  readonly maxAttempts: number
  /**
   * Decide if an error should trigger a retry.
   * Returns true if retry should be attempted.
   */
  shouldRetry(attempt: number, error: unknown): boolean
}

/**
 * Standard retry policy - retries on transient errors (429, 529, connection).
 */
export class StandardRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number

  constructor(maxAttempts: number = 10) {
    this.maxAttempts = maxAttempts
  }

  shouldRetry(attempt: number, error: unknown): boolean {
    if (attempt >= this.maxAttempts) {
      return false
    }

    if (!(error instanceof Error)) {
      return false
    }

    // Check for transient API errors
    if ('status' in error) {
      const status = (error as any).status
      // 429 = rate limit, 529 = capacity, 5xx = server error
      return status === 429 || status === 529 || (status >= 500 && status < 600)
    }

    // Connection errors are retryable
    const message = error.message?.toLowerCase() ?? ''
    return (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('connection')
    )
  }
}

/**
 * Persistent retry policy - retries indefinitely for unattended sessions.
 *
 * Used when NEXUS_UNATTENDED_RETRY is enabled. Retries 429/529 indefinitely
 * with higher backoff, useful for long-running unattended operations.
 */
export class PersistentRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number = Infinity

  shouldRetry(attempt: number, error: unknown): boolean {
    if (!NEXUS_UNATTENDED_RETRY) {
      // Fall back to standard policy if not in persistent mode
      const standard = new StandardRetryPolicy()
      return standard.shouldRetry(attempt, error)
    }

    if (!(error instanceof Error)) {
      return false
    }

    // In persistent mode, retry on rate limit and capacity errors indefinitely
    if ('status' in error) {
      const status = (error as any).status
      return status === 429 || status === 529
    }

    return false
  }
}

/**
 * Get the appropriate retry policy based on environment and context.
 */
export function createRetryPolicy(
  maxAttempts?: number
): RetryPolicy {
  if (NEXUS_UNATTENDED_RETRY) {
    return new PersistentRetryPolicy()
  }
  return new StandardRetryPolicy(maxAttempts ?? 10)
}
