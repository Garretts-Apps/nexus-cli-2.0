/**
 * Phase 5: Session Launch
 *
 * Handles deferred prefetches, background housekeeping,
 * and session lifecycle management that runs after the REPL renders.
 */
import { isEnvTruthy, isBareMode } from '../utils/envUtils.js';
import { initUser, resetUserCache } from '../utils/user.js';
import { getUserContext } from '../context.js';
import { getRelevantTips } from '../services/tips/tipRegistry.js';
import { prefetchAwsCredentialsAndBedRockInfoIfSafe, prefetchGcpCredentialsIfSafe } from '../utils/auth.js';
import { countFilesRoundedRg } from '../utils/ripgrep.js';
import { getCwd } from '../utils/cwd.js';
import { initializeAnalyticsGates } from '../services/analytics/sink.js';
import { prefetchOfficialMcpUrls } from '../services/mcp/officialRegistry.js';
import { refreshModelCapabilities } from '../utils/model/modelCapabilities.js';
import { settingsChangeDetector } from '../utils/settings/changeDetector.js';
import { skillChangeDetector } from '../utils/skills/skillChangeDetector.js';
import { prefetchSystemContextIfSafe } from './authFlow.js';

/**
 * Start background prefetches and housekeeping that are NOT needed before first render.
 * These are deferred from setup() to reduce event loop contention and child process
 * spawning during the critical startup path.
 * Call this after the REPL has been rendered.
 */
export function startDeferredPrefetches(): void {
  // Skip all of it when we're only measuring startup performance.
  if (isEnvTruthy(process.env.NEXUS_EXIT_AFTER_FIRST_RENDER) ||
  // --bare: skip ALL prefetches. These are cache-warms for the REPL's
  // first-turn responsiveness. Scripted -p calls don't have a
  // "user is typing" window to hide this work in — it's pure overhead on
  // the critical path.
  isBareMode()) {
    return;
  }

  // Process-spawning prefetches (consumed at first API call, user is still typing)
  void initUser();
  void getUserContext();
  prefetchSystemContextIfSafe();
  void getRelevantTips();
  if (isEnvTruthy(process.env.NEXUS_USE_BEDROCK) && !isEnvTruthy(process.env.NEXUS_SKIP_BEDROCK_AUTH)) {
    void prefetchAwsCredentialsAndBedRockInfoIfSafe();
  }
  if (isEnvTruthy(process.env.NEXUS_USE_VERTEX) && !isEnvTruthy(process.env.NEXUS_SKIP_VERTEX_AUTH)) {
    void prefetchGcpCredentialsIfSafe();
  }
  void countFilesRoundedRg(getCwd(), AbortSignal.timeout(3000), []);

  // Analytics and feature flag initialization
  void initializeAnalyticsGates();
  void prefetchOfficialMcpUrls();
  void refreshModelCapabilities();

  // File change detectors deferred from init() to unblock first render
  void settingsChangeDetector.initialize();
  if (!isBareMode()) {
    void skillChangeDetector.initialize();
  }

  // Event loop stall detector — logs when the main thread is blocked >500ms
  if ("external" === 'ant') {
    void import('../utils/eventLoopStallDetector.js').then(m => m.startEventLoopStallDetector());
  }
}
