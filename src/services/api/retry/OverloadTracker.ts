/**
 * OverloadTracker - tracks 529 overload status and rate limiting.
 *
 * Extracted from withRetry.ts retry loop for clarity and composability.
 * Tracks when the API is at capacity and adjusts retry behavior accordingly.
 */

/**
 * 529 overload tracking state.
 */
interface OverloadState {
  /**
   * Total count of 529 errors encountered.
   */
  count: number
  /**
   * Timestamp of the first 529 error in current window.
   */
  firstSeenAt: number
  /**
   * Whether we're currently in a cooldown period.
   */
  inCooldown: boolean
  /**
   * Timestamp when cooldown will expire.
   */
  cooldownUntil: number
}

/**
 * OverloadTracker manages 529 capacity error state.
 *
 * Helps distinguish between transient rate limits and sustained
 * overload, adjusting retry strategy accordingly.
 */
export class OverloadTracker {
  private state: OverloadState = {
    count: 0,
    firstSeenAt: 0,
    inCooldown: false,
    cooldownUntil: 0,
  }

  private readonly windowMs: number = 60000 // 1 minute window
  private readonly cooldownMs: number = 30000 // 30 second cooldown

  /**
   * Record a 529 error occurrence.
   */
  record529Error(): void {
    const now = Date.now()

    // Reset if we're outside the window
    if (now - this.state.firstSeenAt > this.windowMs) {
      this.state.count = 0
      this.state.firstSeenAt = now
    }

    this.state.count++

    // Enter cooldown after multiple 529s
    if (this.state.count >= 3) {
      this.state.inCooldown = true
      this.state.cooldownUntil = now + this.cooldownMs
    }
  }

  /**
   * Check if we're currently in overload cooldown.
   */
  isInCooldown(): boolean {
    if (!this.state.inCooldown) {
      return false
    }

    const now = Date.now()
    if (now > this.state.cooldownUntil) {
      this.state.inCooldown = false
      return false
    }

    return true
  }

  /**
   * Get the current 529 error count in this window.
   */
  get529Count(): number {
    // Reset if window expired
    if (Date.now() - this.state.firstSeenAt > this.windowMs) {
      this.state.count = 0
    }
    return this.state.count
  }

  /**
   * Get suggested backoff multiplier based on overload state.
   * Returns 1.0 for normal, > 1.0 for increased backoff during cooldown.
   */
  getBackoffMultiplier(): number {
    if (this.isInCooldown()) {
      // During cooldown, apply 2x-4x backoff
      return 2 + (this.get529Count() - 3) * 0.5
    }
    return 1.0
  }

  /**
   * Reset all tracking state.
   */
  reset(): void {
    this.state = {
      count: 0,
      firstSeenAt: 0,
      inCooldown: false,
      cooldownUntil: 0,
    }
  }
}
