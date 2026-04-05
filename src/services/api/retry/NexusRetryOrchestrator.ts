/**
 * NexusRetryOrchestrator - composition-based retry engine.
 *
 * Replaces the monolithic withRetry.ts pattern with decoupled components:
 * - RetryPolicy: decides if an error should retry
 * - BackoffStrategy: calculates delay between retries
 * - OverloadTracker: tracks 529 capacity errors
 *
 * Removes CLAUDE_CODE_* env var coupling and makes retry logic testable.
 */

import type { RetryPolicy } from './RetryPolicy'
import type { BackoffStrategy } from './BackoffStrategy'
import { OverloadTracker } from './OverloadTracker'
import { sleep } from '../../../utils/sleep'

export interface NexusRetryOrchestratorConfig {
  policy: RetryPolicy
  backoff: BackoffStrategy
  tracker?: OverloadTracker
  /**
   * Callback when a retry attempt is about to happen.
   * Useful for logging or monitoring.
   */
  onRetry?: (attempt: number, delay: number, error: unknown) => void
}

/**
 * NexusRetryOrchestrator wraps async functions and async generators with retry logic.
 *
 * Decouples retry policy, backoff, and overload tracking from the execution path.
 * Makes it easier to test and compose different retry strategies.
 */
export class NexusRetryOrchestrator {
  private policy: RetryPolicy
  private backoff: BackoffStrategy
  private tracker: OverloadTracker
  private onRetry?: (attempt: number, delay: number, error: unknown) => void

  constructor(config: NexusRetryOrchestratorConfig) {
    this.policy = config.policy
    this.backoff = config.backoff
    this.tracker = config.tracker ?? new OverloadTracker()
    this.onRetry = config.onRetry
  }

  /**
   * Wrap a promise-returning function with retry logic.
   */
  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown
    let attempt = 0

    while (true) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        // Track 529 errors for overload detection
        if (this.is529Error(error)) {
          this.tracker.record529Error()
        }

        // Check if we should retry
        if (!this.policy.shouldRetry(attempt, error)) {
          throw error
        }

        // Calculate delay
        let delay = this.backoff.getDelay(attempt)
        const backoffMultiplier = this.tracker.getBackoffMultiplier()
        delay = Math.floor(delay * backoffMultiplier)

        // Notify and wait
        this.onRetry?.(attempt, delay, error)
        await sleep(delay)

        attempt++
      }
    }
  }

  /**
   * Wrap an async generator function with retry logic.
   *
   * Retries the entire generator if it throws an error.
   * Useful for streaming APIs where a 529 should restart the stream.
   */
  async *wrapStream<T>(fn: () => AsyncGenerator<T>): AsyncGenerator<T> {
    let lastError: unknown
    let attempt = 0

    while (true) {
      try {
        // Create a new generator each retry
        const generator = fn()

        // Yield all values from the generator
        for await (const value of generator) {
          yield value
        }

        // If we got here, generator completed successfully
        return
      } catch (error) {
        lastError = error

        // Track 529 errors
        if (this.is529Error(error)) {
          this.tracker.record529Error()
        }

        // Check if we should retry
        if (!this.policy.shouldRetry(attempt, error)) {
          throw error
        }

        // Calculate delay
        let delay = this.backoff.getDelay(attempt)
        const backoffMultiplier = this.tracker.getBackoffMultiplier()
        delay = Math.floor(delay * backoffMultiplier)

        // Notify and wait before retrying
        this.onRetry?.(attempt, delay, error)
        await sleep(delay)

        attempt++
      }
    }
  }

  /**
   * Check if an error is a 529 capacity error.
   */
  private is529Error(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }
    if ('status' in error) {
      return (error as any).status === 529
    }
    return false
  }

  /**
   * Reset all tracking state.
   * Useful between independent retry scenarios.
   */
  reset(): void {
    this.tracker.reset()
  }
}
