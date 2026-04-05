/**
 * Nexus-owned environment variables for retry orchestration.
 *
 * Replaces CLAUDE_CODE_* env vars with Nexus-specific naming.
 * All settings are safe to expose (they're configuration, not secrets).
 */

import { isEnvTruthy } from '../../../utils/envUtils.js'

/**
 * Enable persistent retry for unattended sessions.
 *
 * For unattended sessions (internal-only). Retries 429/529
 * indefinitely with higher backoff and periodic keep-alive yields so the host
 * environment does not mark the session idle mid-wait.
 *
 * Replaces: CLAUDE_CODE_UNATTENDED_RETRY
 */
export const NEXUS_UNATTENDED_RETRY = isEnvTruthy(
  process.env.NEXUS_UNATTENDED_RETRY
)

/**
 * Use AWS Bedrock as the AI provider instead of Anthropic API.
 *
 * Replaces: CLAUDE_CODE_USE_BEDROCK
 */
export const NEXUS_USE_BEDROCK = isEnvTruthy(
  process.env.NEXUS_USE_BEDROCK
)

/**
 * Use Google Vertex AI as the AI provider instead of Anthropic API.
 *
 * Replaces: CLAUDE_CODE_USE_VERTEX
 */
export const NEXUS_USE_VERTEX = isEnvTruthy(
  process.env.NEXUS_USE_VERTEX
)

/**
 * Use remote provider configuration.
 *
 * Replaces: CLAUDE_CODE_REMOTE
 */
export const NEXUS_REMOTE = isEnvTruthy(
  process.env.NEXUS_REMOTE
)

/**
 * Override maximum number of retries.
 *
 * Replaces: CLAUDE_CODE_MAX_RETRIES
 */
export function getNexusMaxRetries(defaultValue: number): number {
  if (process.env.NEXUS_MAX_RETRIES) {
    return parseInt(process.env.NEXUS_MAX_RETRIES, 10)
  }
  return defaultValue
}
