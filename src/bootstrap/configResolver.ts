/**
 * Phase 2: Configuration Resolution
 *
 * Handles loading settings from files/env, resolving remote config,
 * environment variable processing, and feature flag evaluation.
 * Pure configuration logic - no state mutations beyond settings caches.
 */
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { profileCheckpoint } from '../utils/startupProfiler.js';
import { eagerParseCliFlag } from '../utils/cliArgs.js';
import { errorMessage, getErrnoCode, isENOENT } from '../utils/errors.js';
import { getFsImplementation, safeResolvePath } from '../utils/fsOperations.js';
import { safeParseJSON } from '../utils/json.js';
import { logError } from '../utils/log.js';
import { resetSettingsCache } from '../utils/settings/settingsCache.js';
import { parseSettingSourcesFlag } from '../utils/settings/constants.js';
import { generateTempFilePath } from '../utils/tempfile.js';
import { writeFileSync_DEPRECATED } from '../utils/slowOperations.js';
import { setAllowedSettingSources, setFlagSettingsPath } from '../state/sessionConfig.js';
import { isEnvTruthy } from '../utils/envUtils.js';
import { getGlobalConfig, isAutoUpdaterDisabled, saveGlobalConfig } from '../utils/config.js';
import { getInitialSettings, getManagedSettingsKeysForLogging, getSettingsForSource } from '../utils/settings/settings.js';
import { isAnalyticsDisabled } from '../services/analytics/config.js';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from '../services/analytics/index.js';
import { getIsGit, getWorktreeCount } from '../utils/git.js';
import { getGhAuthStatus } from '../utils/github/ghAuthStatus.js';
import { SandboxManager } from '../utils/sandbox/sandbox-adapter.js';
import { isRunningWithBun } from '../utils/bundledMode.js';
import { hasNodeOption } from '../utils/envUtils.js';
import { migrateAutoUpdatesToSettings } from '../migrations/migrateAutoUpdatesToSettings.js';
import { migrateBypassPermissionsAcceptedToSettings } from '../migrations/migrateBypassPermissionsAcceptedToSettings.js';
import { migrateEnableAllProjectMcpServersToSettings } from '../migrations/migrateEnableAllProjectMcpServersToSettings.js';
import { migrateFennecToOpus } from '../migrations/migrateFennecToOpus.js';
import { migrateLegacyOpusToCurrent } from '../migrations/migrateLegacyOpusToCurrent.js';
import { migrateOpusToOpus1m } from '../migrations/migrateOpusToOpus1m.js';
import { migrateReplBridgeEnabledToRemoteControlAtStartup } from '../migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.js';
import { migrateSonnet1mToSonnet45 } from '../migrations/migrateSonnet1mToSonnet45.js';
import { migrateSonnet45ToSonnet46 } from '../migrations/migrateSonnet45ToSonnet46.js';
import { resetAutoModeOptInForDefaultOffer } from '../migrations/resetAutoModeOptInForDefaultOffer.js';
import { resetProToOpusDefault } from '../migrations/resetProToOpusDefault.js';
import { migrateChangelogFromConfig } from '../utils/releaseNotes.js';
import { feature } from 'bun:bundle';

/**
 * Load settings from a --settings flag value (JSON string or file path).
 * Creates a temp file for JSON strings with content-hash-based paths to avoid
 * busting the API prompt cache.
 */
export function loadSettingsFromFlag(settingsFile: string): void {
  try {
    const trimmedSettings = settingsFile.trim();
    const looksLikeJson = trimmedSettings.startsWith('{') && trimmedSettings.endsWith('}');
    let settingsPath: string;
    if (looksLikeJson) {
      const parsedJson = safeParseJSON(trimmedSettings);
      if (!parsedJson) {
        process.stderr.write(chalk.red('Error: Invalid JSON provided to --settings\n'));
        process.exit(1);
      }
      settingsPath = generateTempFilePath('claude-settings', '.json', {
        contentHash: trimmedSettings
      });
      writeFileSync_DEPRECATED(settingsPath, trimmedSettings, 'utf8');
    } else {
      const {
        resolvedPath: resolvedSettingsPath
      } = safeResolvePath(getFsImplementation(), settingsFile);
      try {
        readFileSync(resolvedSettingsPath, 'utf8');
      } catch (e) {
        if (isENOENT(e)) {
          process.stderr.write(chalk.red(`Error: Settings file not found: ${resolvedSettingsPath}\n`));
          process.exit(1);
        }
        throw e;
      }
      settingsPath = resolvedSettingsPath;
    }
    setFlagSettingsPath(settingsPath);
    resetSettingsCache();
  } catch (error) {
    if (error instanceof Error) {
      logError(error);
    }
    process.stderr.write(chalk.red(`Error processing settings: ${errorMessage(error)}\n`));
    process.exit(1);
  }
}

/**
 * Load setting sources from a --setting-sources flag value.
 */
export function loadSettingSourcesFromFlag(settingSourcesArg: string): void {
  try {
    const sources = parseSettingSourcesFlag(settingSourcesArg);
    setAllowedSettingSources(sources);
    resetSettingsCache();
  } catch (error) {
    if (error instanceof Error) {
      logError(error);
    }
    process.stderr.write(chalk.red(`Error processing --setting-sources: ${errorMessage(error)}\n`));
    process.exit(1);
  }
}

/**
 * Parse and load settings flags early, before init().
 * This ensures settings are filtered from the start of initialization.
 */
export function eagerLoadSettings(): void {
  profileCheckpoint('eagerLoadSettings_start');
  const settingsFile = eagerParseCliFlag('--settings');
  if (settingsFile) {
    loadSettingsFromFlag(settingsFile);
  }
  const settingSourcesArg = eagerParseCliFlag('--setting-sources');
  if (settingSourcesArg !== undefined) {
    loadSettingSourcesFromFlag(settingSourcesArg);
  }
  profileCheckpoint('eagerLoadSettings_end');
}

/**
 * Determine the entrypoint type based on CLI arguments and environment.
 */
export function initializeEntrypoint(isNonInteractive: boolean): void {
  if (process.env.NEXUS_ENTRYPOINT) {
    return;
  }
  const cliArgs = process.argv.slice(2);
  const mcpIndex = cliArgs.indexOf('mcp');
  if (mcpIndex !== -1 && cliArgs[mcpIndex + 1] === 'serve') {
    process.env.NEXUS_ENTRYPOINT = 'mcp';
    return;
  }
  if (isEnvTruthy(process.env.NEXUS_ACTION)) {
    process.env.NEXUS_ENTRYPOINT = 'nexus-github-action';
    return;
  }
  process.env.NEXUS_ENTRYPOINT = isNonInteractive ? 'sdk-cli' : 'cli';
}

// @[MODEL LAUNCH]: Consider any migrations you may need for model strings.
// Bump this when adding a new sync migration so existing users re-run the set.
const CURRENT_MIGRATION_VERSION = 11;

/**
 * Run all pending synchronous migrations and fire async ones.
 */
export function runMigrations(): void {
  if (getGlobalConfig().migrationVersion !== CURRENT_MIGRATION_VERSION) {
    migrateAutoUpdatesToSettings();
    migrateBypassPermissionsAcceptedToSettings();
    migrateEnableAllProjectMcpServersToSettings();
    resetProToOpusDefault();
    migrateSonnet1mToSonnet45();
    migrateLegacyOpusToCurrent();
    migrateSonnet45ToSonnet46();
    migrateOpusToOpus1m();
    migrateReplBridgeEnabledToRemoteControlAtStartup();
    if (feature('TRANSCRIPT_CLASSIFIER')) {
      resetAutoModeOptInForDefaultOffer();
    }
    if ("external" === 'ant') {
      migrateFennecToOpus();
    }
    saveGlobalConfig(prev => prev.migrationVersion === CURRENT_MIGRATION_VERSION ? prev : {
      ...prev,
      migrationVersion: CURRENT_MIGRATION_VERSION
    });
  }
  migrateChangelogFromConfig().catch(() => {
    // Silently ignore migration errors - will retry on next startup
  });
}

/**
 * Log managed settings keys to Statsig for analytics.
 * Called after init() completes to ensure settings are loaded
 * and environment variables are applied before model resolution.
 */
export function logManagedSettings(): void {
  try {
    const policySettings = getSettingsForSource('policySettings');
    if (policySettings) {
      const allKeys = getManagedSettingsKeysForLogging(policySettings);
      logEvent('tengu_managed_settings_loaded', {
        keyCount: allKeys.length,
        keys: allKeys.join(',') as unknown as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    }
  } catch {
    // Silently ignore errors - this is just for analytics
  }
}

/**
 * Check if running in debug/inspection mode.
 */
export function isBeingDebugged(): boolean {
  const isBun = isRunningWithBun();
  const hasInspectArg = process.execArgv.some(arg => {
    if (isBun) {
      return /--inspect(-brk)?/.test(arg);
    } else {
      return /--inspect(-brk)?|--debug(-brk)?/.test(arg);
    }
  });
  const hasInspectEnv = process.env.NODE_OPTIONS && /--inspect(-brk)?|--debug(-brk)?/.test(process.env.NODE_OPTIONS);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inspector = (global as any).require('inspector');
    const hasInspectorUrl = !!inspector.url();
    return hasInspectorUrl || hasInspectArg || !!hasInspectEnv;
  } catch {
    return hasInspectArg || !!hasInspectEnv;
  }
}

/**
 * Get certificate-related environment variable telemetry.
 */
export function getCertEnvVarTelemetry(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  if (process.env.NODE_EXTRA_CA_CERTS) {
    result.has_node_extra_ca_certs = true;
  }
  if (process.env.NEXUS_CLIENT_CERT) {
    result.has_client_cert = true;
  }
  if (hasNodeOption('--use-system-ca')) {
    result.has_use_system_ca = true;
  }
  if (hasNodeOption('--use-openssl-ca')) {
    result.has_use_openssl_ca = true;
  }
  return result;
}

/**
 * Log startup telemetry data.
 */
export async function logStartupTelemetry(): Promise<void> {
  if (isAnalyticsDisabled()) return;
  const [isGit, worktreeCount, ghAuthStatus] = await Promise.all([getIsGit(), getWorktreeCount(), getGhAuthStatus()]);
  logEvent('tengu_startup_telemetry', {
    is_git: isGit,
    worktree_count: worktreeCount,
    gh_auth_status: ghAuthStatus as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    sandbox_enabled: SandboxManager.isSandboxingEnabled(),
    are_unsandboxed_commands_allowed: SandboxManager.areUnsandboxedCommandsAllowed(),
    is_auto_bash_allowed_if_sandbox_enabled: SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
    auto_updater_disabled: isAutoUpdaterDisabled(),
    prefers_reduced_motion: getInitialSettings().prefersReducedMotion ?? false,
    ...getCertEnvVarTelemetry()
  });
}

/**
 * Handle system prompt options from CLI flags.
 * Returns the resolved system prompt string.
 */
export function resolveSystemPrompt(options: {
  systemPrompt?: string;
  systemPromptFile?: string;
}): string | undefined {
  let systemPrompt = options.systemPrompt;
  if (options.systemPromptFile) {
    if (options.systemPrompt) {
      process.stderr.write(chalk.red('Error: Cannot use both --system-prompt and --system-prompt-file. Please use only one.\n'));
      process.exit(1);
    }
    try {
      const filePath = resolve(options.systemPromptFile);
      systemPrompt = readFileSync(filePath, 'utf8');
    } catch (error) {
      const code = getErrnoCode(error);
      if (code === 'ENOENT') {
        process.stderr.write(chalk.red(`Error: System prompt file not found: ${resolve(options.systemPromptFile)}\n`));
        process.exit(1);
      }
      process.stderr.write(chalk.red(`Error reading system prompt file: ${errorMessage(error)}\n`));
      process.exit(1);
    }
  }
  return systemPrompt;
}

/**
 * Handle append system prompt options from CLI flags.
 * Returns the resolved append system prompt string.
 */
export function resolveAppendSystemPrompt(options: {
  appendSystemPrompt?: string;
  appendSystemPromptFile?: string;
}): string | undefined {
  let appendSystemPrompt = options.appendSystemPrompt;
  if (options.appendSystemPromptFile) {
    if (options.appendSystemPrompt) {
      process.stderr.write(chalk.red('Error: Cannot use both --append-system-prompt and --append-system-prompt-file. Please use only one.\n'));
      process.exit(1);
    }
    try {
      const filePath = resolve(options.appendSystemPromptFile);
      appendSystemPrompt = readFileSync(filePath, 'utf8');
    } catch (error) {
      const code = getErrnoCode(error);
      if (code === 'ENOENT') {
        process.stderr.write(chalk.red(`Error: Append system prompt file not found: ${resolve(options.appendSystemPromptFile)}\n`));
        process.exit(1);
      }
      process.stderr.write(chalk.red(`Error reading append system prompt file: ${errorMessage(error)}\n`));
      process.exit(1);
    }
  }
  return appendSystemPrompt;
}
