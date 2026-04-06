/**
 * Phase 4: Feature Gating
 *
 * Evaluates feature flags, checks tier/permissions, sets feature state.
 * Contains logic for proactive mode, brief mode, and session telemetry.
 */
import { feature } from 'bun:bundle';
import { isEnvTruthy } from '../utils/envUtils.js';
import { logEvent } from '../services/analytics/index.js';
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../services/analytics/index.js';
import { setUserMsgOptIn } from '../state/sessionConfig.js';
import { logError } from '../utils/log.js';
import { parseUserSpecifiedModel } from '../utils/model/model.js';
import { getDefaultMainLoopModel } from '../utils/model/model.js';
import { getContextWindowForModel } from '../utils/context.js';
import { getInitialMainLoopModel, getSdkBetas } from '../state/sessionConfig.js';
import { getCwd } from '../utils/cwd.js';
import { logSkillsLoaded } from '../utils/telemetry/skillLoadedEvent.js';
import { loadAllPluginsCacheOnly } from '../utils/plugins/pluginLoader.js';
import { getManagedPluginNames } from '../utils/plugins/managedPlugins.js';
import { getPluginSeedDirs } from '../utils/plugins/pluginDirectories.js';
import { logPluginLoadErrors, logPluginsEnabledForSession } from '../utils/telemetry/pluginTelemetry.js';

/**
 * Activate proactive mode if enabled via CLI flag or environment variable.
 */
export function maybeActivateProactive(options: unknown): void {
  if ((feature('BRIEF_MODE') || feature('ASSISTANT_MODE')) && ((options as {
    proactive?: boolean;
  }).proactive || isEnvTruthy(process.env.NEXUS_BRIEF_MODE))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const briefModeModule = require('../proactive/index.js');
    if (!briefModeModule.isProactiveActive()) {
      briefModeModule.activateProactive('command');
    }
  }
}

/**
 * Activate brief mode if enabled via CLI flag or environment variable.
 */
export function maybeActivateBrief(options: unknown): void {
  if (!(feature('ASSISTANT_MODE') || feature('ASSISTANT_MODE_BRIEF'))) return;
  const briefFlag = (options as {
    brief?: boolean;
  }).brief;
  const briefEnv = isEnvTruthy(process.env.NEXUS_BRIEF);
  if (!briefFlag && !briefEnv) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const {
    isBriefEntitled
  } = require('../tools/BriefTool/BriefTool.js') as typeof import('../tools/BriefTool/BriefTool.js');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const entitled = isBriefEntitled();
  if (entitled) {
    setUserMsgOptIn(true);
  }
  logEvent('tengu_brief_mode_enabled', {
    enabled: entitled,
    gated: !entitled,
    source: (briefEnv ? 'env' : 'flag') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  });
}

/**
 * Per-session skill/plugin telemetry. Called from both the interactive path
 * and the headless -p path (before runHeadless) — both go through
 * main.tsx but branch before the interactive startup path, so it needs two
 * call sites here rather than one here + one in QueryEngine.
 */
export function logSessionTelemetry(): void {
  const model = parseUserSpecifiedModel(getInitialMainLoopModel() ?? getDefaultMainLoopModel());
  void logSkillsLoaded(getCwd(), getContextWindowForModel(model, getSdkBetas()));
  void loadAllPluginsCacheOnly().then(({
    enabled,
    errors
  }) => {
    const managedNames = getManagedPluginNames();
    logPluginsEnabledForSession(enabled, managedNames, getPluginSeedDirs());
    logPluginLoadErrors(errors, managedNames);
  }).catch(err => logError(err));
}

/**
 * Extract teammate identity options from parsed CLI options.
 */
export type TeammateOptions = {
  agentId?: string;
  agentName?: string;
  teamName?: string;
  agentColor?: string;
  planModeRequired?: boolean;
  parentSessionId?: string;
  teammateMode?: 'auto' | 'tmux' | 'in-process';
  agentType?: string;
};

export function extractTeammateOptions(options: unknown): TeammateOptions {
  if (typeof options !== 'object' || options === null) {
    return {};
  }
  const opts = options as Record<string, unknown>;
  const teammateMode = opts.teammateMode;
  return {
    agentId: typeof opts.agentId === 'string' ? opts.agentId : undefined,
    agentName: typeof opts.agentName === 'string' ? opts.agentName : undefined,
    teamName: typeof opts.teamName === 'string' ? opts.teamName : undefined,
    agentColor: typeof opts.agentColor === 'string' ? opts.agentColor : undefined,
    planModeRequired: typeof opts.planModeRequired === 'boolean' ? opts.planModeRequired : undefined,
    parentSessionId: typeof opts.parentSessionId === 'string' ? opts.parentSessionId : undefined,
    teammateMode: teammateMode === 'auto' || teammateMode === 'tmux' || teammateMode === 'in-process' ? teammateMode : undefined,
    agentType: typeof opts.agentType === 'string' ? opts.agentType : undefined
  };
}

/**
 * Reset the terminal cursor visibility on exit.
 */
export function resetCursor(): void {
  // Dynamic import to avoid circular deps - SHOW_CURSOR is a constant string
  const { SHOW_CURSOR } = require('../ink/termio/dec.js') as typeof import('../ink/termio/dec.js');
  const terminal = process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined;
  terminal?.write(SHOW_CURSOR);
}
