# ARCH-004: Promote utils/ Subsystems to Top-Level Modules

**Status:** Design / Analysis Only — No files moved  
**Date:** 2026-04-06  
**Scope:** 590 files in `src/utils/`, 33 subdirectories  

---

## Executive Summary

`src/utils/` contains 590 files across 33 subdirectories with no enforced boundaries. Eight subsystems already have natural directory groupings (`bash/`, `shell/`, `permissions/`, `plugins/`, `settings/`, `model/`, `hooks/`) and account for ~220 of the 590 files. Promoting these to `src/<subsystem>/` requires updating **717 import lines** across the codebase. The migration is safe but must follow a strict ordering because of two confirmed bi-directional dependency pairs:

- `settings/` ↔ `permissions/` (highest-risk circular: `settings/types.ts` imports `permissions/PermissionMode`, `settings/validateEditTool.ts` imports `permissions/filesystem`, `permissions/permissionsLoader.ts` imports `settings/settings` and `settings/types`)
- `shell/` → `settings/` (unidirectional: `shell/shellProvider.ts` imports `settings/settings`)
- `model/` → `auth/` (unidirectional: `model/model.ts`, `model/bedrock.ts`, `model/check1mAccess.ts`, `model/modelCapabilities.ts` all import `auth.ts`)
- `hooks/` → `settings/`, `permissions/`, `model/` (hooks depends on all three)

---

## Section 1: Full File Categorization

### 1A. Bash Subsystem → `src/bash/` (23 files)

All files in `src/utils/bash/`:

| File | Destination |
|------|-------------|
| `bash/ParsedCommand.ts` | `src/bash/ParsedCommand.ts` |
| `bash/ShellSnapshot.ts` | `src/bash/ShellSnapshot.ts` |
| `bash/ast.ts` | `src/bash/ast.ts` |
| `bash/bashParser.ts` | `src/bash/bashParser.ts` |
| `bash/bashPipeCommand.ts` | `src/bash/bashPipeCommand.ts` |
| `bash/commands.ts` | `src/bash/commands.ts` |
| `bash/heredoc.ts` | `src/bash/heredoc.ts` |
| `bash/parser.ts` | `src/bash/parser.ts` |
| `bash/prefix.ts` | `src/bash/prefix.ts` |
| `bash/registry.ts` | `src/bash/registry.ts` |
| `bash/shellCompletion.ts` | `src/bash/shellCompletion.ts` |
| `bash/shellPrefix.ts` | `src/bash/shellPrefix.ts` |
| `bash/shellQuote.ts` | `src/bash/shellQuote.ts` |
| `bash/shellQuoting.ts` | `src/bash/shellQuoting.ts` |
| `bash/specs/alias.ts` | `src/bash/specs/alias.ts` |
| `bash/specs/index.ts` | `src/bash/specs/index.ts` |
| `bash/specs/nohup.ts` | `src/bash/specs/nohup.ts` |
| `bash/specs/pyright.ts` | `src/bash/specs/pyright.ts` |
| `bash/specs/sleep.ts` | `src/bash/specs/sleep.ts` |
| `bash/specs/srun.ts` | `src/bash/specs/srun.ts` |
| `bash/specs/time.ts` | `src/bash/specs/time.ts` |
| `bash/specs/timeout.ts` | `src/bash/specs/timeout.ts` |
| `bash/treeSitterAnalysis.ts` | `src/bash/treeSitterAnalysis.ts` |

**External deps that become internal after promotion:**
`Shell.ts`, `cleanupRegistry.ts`, `cwd.ts`, `debug.ts`, `envUtils.ts`, `file.ts`, `fsOperations.ts`, `localInstaller.ts`, `log.ts`, `memoize.ts`, `platform.ts`, `ripgrep.ts`, `slowOperations.ts`, `subprocessEnv.ts` — these remain in `src/utils/` and bash/ will import them as `src/utils/...`

**External consumers (import path change required):**
- `src/utils/shell/specPrefix.ts` (imports `bash/registry`, `bash/shellPrefix`, `bash/shellQuote`, `bash/ShellSnapshot`, `bash/bashPipeCommand`)
- `src/tools/BashTool/` (7 files: `commandSemantics.ts`, `bashCommandHelpers.ts`, `bashSecurity.ts`, `modeValidation.ts`, `BashTool.tsx`, `sedEditParser.ts`, `pathValidation.ts`, `readOnlyValidation.ts`)
- `src/tools/shared/spawnMultiAgent.ts`
- `src/utils/swarm/backends/PaneBackendExecutor.ts`
- `src/components/permissions/BashPermissionRequest/` (2 files)
- `src/components/permissions/hooks.ts`
- `src/hooks/useTypeahead.tsx`
- `src/commands/clear/caches.ts`

---

### 1B. Shell Subsystem → `src/shell/` (13 files + 1 test)

All files in `src/utils/shell/`:

| File | Destination |
|------|-------------|
| `shell/bashProvider.ts` | `src/shell/bashProvider.ts` |
| `shell/externalCommandValidation.ts` | `src/shell/externalCommandValidation.ts` |
| `shell/outputLimits.ts` | `src/shell/outputLimits.ts` |
| `shell/powershellDetection.ts` | `src/shell/powershellDetection.ts` |
| `shell/powershellProvider.ts` | `src/shell/powershellProvider.ts` |
| `shell/prefix.ts` | `src/shell/prefix.ts` |
| `shell/readOnlyCommandValidation.ts` | `src/shell/readOnlyCommandValidation.ts` |
| `shell/resolveDefaultShell.ts` | `src/shell/resolveDefaultShell.ts` |
| `shell/shellProvider.ts` | `src/shell/shellProvider.ts` |
| `shell/shellToolUtils.ts` | `src/shell/shellToolUtils.ts` |
| `shell/specPrefix.ts` | `src/shell/specPrefix.ts` |
| `shell/__tests__/externalCommandValidation.test.ts` | `src/shell/__tests__/externalCommandValidation.test.ts` |

**Also co-locate from flat utils/:**
- `Shell.ts` → `src/shell/Shell.ts`
- `ShellCommand.ts` → `src/shell/ShellCommand.ts`
- `shellConfig.ts` → `src/shell/shellConfig.ts`
- `powershell/dangerousCmdlets.ts` → `src/shell/powershell/dangerousCmdlets.ts`
- `powershell/parser.ts` → `src/shell/powershell/parser.ts`
- `powershell/staticPrefix.ts` → `src/shell/powershell/staticPrefix.ts`

**CRITICAL: `shell/shellProvider.ts` imports `settings/settings.js`.** Shell must be promoted AFTER settings, or `shell/shellProvider.ts` must use the new `src/settings/settings` path.

**External consumers (14 files, 13 import lines):**
`src/tools/PowerShellTool/` (4 files), `src/tools/BashTool/utils.ts`, `src/tools/BashTool/readOnlyValidation.ts`, `src/constants/tools.ts`, `src/utils/streamlinedTransform.ts`, `src/schemas/hooks.ts`, `src/screens/Doctor.tsx`, `src/tools.ts`, `src/services/compact/apiMicrocompact.ts`, `src/services/compact/microCompact.ts`

---

### 1C. Auth Subsystem → `src/auth/` (9 files)

| File | Destination |
|------|-------------|
| `auth.ts` | `src/auth/auth.ts` |
| `authFileDescriptor.ts` | `src/auth/authFileDescriptor.ts` |
| `authPortable.ts` | `src/auth/authPortable.ts` |
| `authValidation.ts` | `src/auth/authValidation.ts` |
| `authValidation.test.ts` | `src/auth/authValidation.test.ts` |
| `aws.ts` | `src/auth/aws.ts` |
| `awsAuthStatusManager.ts` | `src/auth/awsAuthStatusManager.ts` |
| `secureStorage/fallbackStorage.ts` | `src/auth/secureStorage/fallbackStorage.ts` |
| `secureStorage/index.ts` | `src/auth/secureStorage/index.ts` |
| `secureStorage/keychainPrefetch.ts` | `src/auth/secureStorage/keychainPrefetch.ts` |
| `secureStorage/macOsKeychainHelpers.ts` | `src/auth/secureStorage/macOsKeychainHelpers.ts` |
| `secureStorage/macOsKeychainStorage.ts` | `src/auth/secureStorage/macOsKeychainStorage.ts` |
| `secureStorage/plainTextStorage.ts` | `src/auth/secureStorage/plainTextStorage.ts` |

**CRITICAL cross-dependencies:**
- `auth.ts` imports `settings/settings.js` (line 78) — auth depends on settings
- `auth.ts` imports `config.ts` — config stays in utils/
- `model/model.ts`, `model/bedrock.ts`, `model/check1mAccess.ts`, `model/modelCapabilities.ts` all import `auth.ts` — after promotion, model/ must update to `src/auth/auth`

**External consumers (70 import lines, 40+ files):**
`src/main.tsx`, `src/commands.ts`, `src/setup.ts`, `src/bridge/` (3 files), `src/cli/handlers/auth.ts`, `src/cli/print.ts`, `src/components/Settings/Config.tsx`, `src/components/Settings/Usage.tsx`, `src/components/Onboarding.tsx`, `src/components/ConsoleOAuthFlow.tsx`, `src/hooks/useApiKeyVerification.ts`, `src/commands/upgrade/`, `src/commands/logout/`, `src/migrations/` (4 files), `src/tools/AgentTool/`, plus React components and voice module.

---

### 1D. Permissions Subsystem → `src/permissions/` (24 files)

All files in `src/utils/permissions/`:

| File | Destination |
|------|-------------|
| `permissions/PermissionMode.ts` | `src/permissions/PermissionMode.ts` |
| `permissions/PermissionPromptToolResultSchema.ts` | `src/permissions/PermissionPromptToolResultSchema.ts` |
| `permissions/PermissionResult.ts` | `src/permissions/PermissionResult.ts` |
| `permissions/PermissionRule.ts` | `src/permissions/PermissionRule.ts` |
| `permissions/PermissionUpdate.ts` | `src/permissions/PermissionUpdate.ts` |
| `permissions/PermissionUpdateSchema.ts` | `src/permissions/PermissionUpdateSchema.ts` |
| `permissions/autoModeState.ts` | `src/permissions/autoModeState.ts` |
| `permissions/bashClassifier.ts` | `src/permissions/bashClassifier.ts` |
| `permissions/bypassPermissionsKillswitch.ts` | `src/permissions/bypassPermissionsKillswitch.ts` |
| `permissions/classifierDecision.ts` | `src/permissions/classifierDecision.ts` |
| `permissions/classifierShared.ts` | `src/permissions/classifierShared.ts` |
| `permissions/dangerousPatterns.ts` | `src/permissions/dangerousPatterns.ts` |
| `permissions/denialTracking.ts` | `src/permissions/denialTracking.ts` |
| `permissions/filesystem.ts` | `src/permissions/filesystem.ts` |
| `permissions/getNextPermissionMode.ts` | `src/permissions/getNextPermissionMode.ts` |
| `permissions/pathValidation.ts` | `src/permissions/pathValidation.ts` |
| `permissions/permissionExplainer.ts` | `src/permissions/permissionExplainer.ts` |
| `permissions/permissionRuleParser.ts` | `src/permissions/permissionRuleParser.ts` |
| `permissions/permissionSetup.ts` | `src/permissions/permissionSetup.ts` |
| `permissions/permissions.ts` | `src/permissions/permissions.ts` |
| `permissions/permissionsLoader.ts` | `src/permissions/permissionsLoader.ts` |
| `permissions/shadowedRuleDetection.ts` | `src/permissions/shadowedRuleDetection.ts` |
| `permissions/shellRuleMatching.ts` | `src/permissions/shellRuleMatching.ts` |
| `permissions/yoloClassifier.ts` | `src/permissions/yoloClassifier.ts` |

**CRITICAL circular dependency:**
- `permissions/permissionsLoader.ts` imports `settings/constants`, `settings/settings`, `settings/types`
- `settings/types.ts` imports `permissions/PermissionMode`
- `settings/validateEditTool.ts` imports `permissions/filesystem`

This is a **true mutual dependency**. Resolution options (see Section 6).

**External consumers (187 import lines, largest consumer count):**
`src/Tool.ts`, `src/main.tsx`, `src/tools/` (15 tool files), `src/tasks/InProcessTeammateTask/types.ts`, `src/types/hooks.ts`, `src/migrations/resetAutoModeOptInForDefaultOffer.ts`

---

### 1E. Plugins Subsystem → `src/plugins/` (44 files)

All files in `src/utils/plugins/`:

| File | Destination |
|------|-------------|
| `plugins/addDirPluginSettings.ts` | `src/plugins/addDirPluginSettings.ts` |
| `plugins/cacheUtils.ts` | `src/plugins/cacheUtils.ts` |
| `plugins/dependencyResolver.ts` | `src/plugins/dependencyResolver.ts` |
| `plugins/fetchTelemetry.ts` | `src/plugins/fetchTelemetry.ts` |
| `plugins/gitAvailability.ts` | `src/plugins/gitAvailability.ts` |
| `plugins/headlessPluginInstall.ts` | `src/plugins/headlessPluginInstall.ts` |
| `plugins/hintRecommendation.ts` | `src/plugins/hintRecommendation.ts` |
| `plugins/installCounts.ts` | `src/plugins/installCounts.ts` |
| `plugins/installedPluginsManager.ts` | `src/plugins/installedPluginsManager.ts` |
| `plugins/loadPluginAgents.ts` | `src/plugins/loadPluginAgents.ts` |
| `plugins/loadPluginCommands.ts` | `src/plugins/loadPluginCommands.ts` |
| `plugins/loadPluginHooks.ts` | `src/plugins/loadPluginHooks.ts` |
| `plugins/loadPluginOutputStyles.ts` | `src/plugins/loadPluginOutputStyles.ts` |
| `plugins/lspPluginIntegration.ts` | `src/plugins/lspPluginIntegration.ts` |
| `plugins/lspRecommendation.ts` | `src/plugins/lspRecommendation.ts` |
| `plugins/managedPlugins.ts` | `src/plugins/managedPlugins.ts` |
| `plugins/marketplaceHelpers.ts` | `src/plugins/marketplaceHelpers.ts` |
| `plugins/marketplaceManager.ts` | `src/plugins/marketplaceManager.ts` |
| `plugins/mcpPluginIntegration.ts` | `src/plugins/mcpPluginIntegration.ts` |
| `plugins/mcpbHandler.ts` | `src/plugins/mcpbHandler.ts` |
| `plugins/officialMarketplace.ts` | `src/plugins/officialMarketplace.ts` |
| `plugins/officialMarketplaceGcs.ts` | `src/plugins/officialMarketplaceGcs.ts` |
| `plugins/officialMarketplaceStartupCheck.ts` | `src/plugins/officialMarketplaceStartupCheck.ts` |
| `plugins/orphanedPluginFilter.ts` | `src/plugins/orphanedPluginFilter.ts` |
| `plugins/parseMarketplaceInput.ts` | `src/plugins/parseMarketplaceInput.ts` |
| `plugins/performStartupChecks.tsx` | `src/plugins/performStartupChecks.tsx` |
| `plugins/pluginAutoupdate.ts` | `src/plugins/pluginAutoupdate.ts` |
| `plugins/pluginBlocklist.ts` | `src/plugins/pluginBlocklist.ts` |
| `plugins/pluginDirectories.ts` | `src/plugins/pluginDirectories.ts` |
| `plugins/pluginFlagging.ts` | `src/plugins/pluginFlagging.ts` |
| `plugins/pluginIdentifier.ts` | `src/plugins/pluginIdentifier.ts` |
| `plugins/pluginInstallationHelpers.ts` | `src/plugins/pluginInstallationHelpers.ts` |
| `plugins/pluginLoader.ts` | `src/plugins/pluginLoader.ts` |
| `plugins/pluginOptionsStorage.ts` | `src/plugins/pluginOptionsStorage.ts` |
| `plugins/pluginPolicy.ts` | `src/plugins/pluginPolicy.ts` |
| `plugins/pluginStartupCheck.ts` | `src/plugins/pluginStartupCheck.ts` |
| `plugins/pluginVersioning.ts` | `src/plugins/pluginVersioning.ts` |
| `plugins/reconciler.ts` | `src/plugins/reconciler.ts` |
| `plugins/refresh.ts` | `src/plugins/refresh.ts` |
| `plugins/schemas.ts` | `src/plugins/schemas.ts` |
| `plugins/validatePlugin.ts` | `src/plugins/validatePlugin.ts` |
| `plugins/walkPluginMarkdown.ts` | `src/plugins/walkPluginMarkdown.ts` |
| `plugins/zipCache.ts` | `src/plugins/zipCache.ts` |
| `plugins/zipCacheAdapters.ts` | `src/plugins/zipCacheAdapters.ts` |

**Cross-deps from plugins/ outward (must remain as `src/utils/...` imports until those are promoted):**
`settings/changeDetector`, `settings/constants`, `settings/settings`, `settings/types`, `permissions/pathValidation`, `model/model`, `telemetry/pluginTelemetry`

**External consumers (131 import lines, 40 files):**
`src/main.tsx`, `src/commands.ts`, `src/QueryEngine.ts`, `src/screens/REPL.tsx`, `src/tools/BashTool/BashTool.tsx`, `src/commands/plugin/` (11 files), `src/services/plugins/` (3 files), `src/hooks/` (5 hook files), `src/outputStyles/loadOutputStylesDir.ts`

---

### 1F. Settings Subsystem → `src/settings/` (19 files)

All files in `src/utils/settings/`:

| File | Destination |
|------|-------------|
| `settings/allErrors.ts` | `src/settings/allErrors.ts` |
| `settings/applySettingsChange.ts` | `src/settings/applySettingsChange.ts` |
| `settings/changeDetector.ts` | `src/settings/changeDetector.ts` |
| `settings/constants.ts` | `src/settings/constants.ts` |
| `settings/internalWrites.ts` | `src/settings/internalWrites.ts` |
| `settings/managedPath.ts` | `src/settings/managedPath.ts` |
| `settings/mdm/constants.ts` | `src/settings/mdm/constants.ts` |
| `settings/mdm/rawRead.ts` | `src/settings/mdm/rawRead.ts` |
| `settings/mdm/settings.ts` | `src/settings/mdm/settings.ts` |
| `settings/permissionValidation.ts` | `src/settings/permissionValidation.ts` |
| `settings/pluginOnlyPolicy.ts` | `src/settings/pluginOnlyPolicy.ts` |
| `settings/schemaOutput.ts` | `src/settings/schemaOutput.ts` |
| `settings/settings.ts` | `src/settings/settings.ts` |
| `settings/settingsCache.ts` | `src/settings/settingsCache.ts` |
| `settings/toolValidationConfig.ts` | `src/settings/toolValidationConfig.ts` |
| `settings/types.ts` | `src/settings/types.ts` |
| `settings/validateEditTool.ts` | `src/settings/validateEditTool.ts` |
| `settings/validation.ts` | `src/settings/validation.ts` |
| `settings/validationTips.ts` | `src/settings/validationTips.ts` |

**CRITICAL: settings/ imports from permissions/ (circular — see Section 6 for resolution):**
- `settings/types.ts:9` imports `permissions/PermissionMode`
- `settings/validateEditTool.ts:2` imports `permissions/filesystem`

**External consumers (135 import lines, 119 files):** Highest breadth of any subsystem. Virtually every non-trivial file in the codebase depends on settings — migrations, tools, commands, components, services, state management.

---

### 1G. Model Subsystem → `src/model/` (16 files)

All files in `src/utils/model/`:

| File | Destination |
|------|-------------|
| `model/agent.ts` | `src/model/agent.ts` |
| `model/aliases.ts` | `src/model/aliases.ts` |
| `model/antModels.ts` | `src/model/antModels.ts` |
| `model/bedrock.ts` | `src/model/bedrock.ts` |
| `model/check1mAccess.ts` | `src/model/check1mAccess.ts` |
| `model/configs.ts` | `src/model/configs.ts` |
| `model/contextWindowUpgradeCheck.ts` | `src/model/contextWindowUpgradeCheck.ts` |
| `model/deprecation.ts` | `src/model/deprecation.ts` |
| `model/model.ts` | `src/model/model.ts` |
| `model/modelAllowlist.ts` | `src/model/modelAllowlist.ts` |
| `model/modelCapabilities.ts` | `src/model/modelCapabilities.ts` |
| `model/modelOptions.ts` | `src/model/modelOptions.ts` |
| `model/modelStrings.ts` | `src/model/modelStrings.ts` |
| `model/modelSupportOverrides.ts` | `src/model/modelSupportOverrides.ts` |
| `model/providers.ts` | `src/model/providers.ts` |
| `model/validateModel.ts` | `src/model/validateModel.ts` |
| `modelCost.ts` (flat) | `src/model/modelCost.ts` |

**Cross-deps:**
- `model/model.ts`, `model/bedrock.ts`, `model/check1mAccess.ts`, `model/modelCapabilities.ts` import `auth.ts` → after both promoted, becomes `src/auth/auth`
- `model/model.ts` imports `settings/settings` → becomes `src/settings/settings`
- `model/modelOptions.ts` imports `auth.ts` → becomes `src/auth/auth`

**External consumers (91 import lines, 80 files):** Widespread usage across tools, components, constants, services.

---

### 1H. Hooks Subsystem → `src/hooks-system/` (18 files)

> Note: `src/hooks/` already exists as a React hooks directory. Name this `src/hooks-system/` or `src/event-hooks/` to avoid collision.

All files in `src/utils/hooks/`:

| File | Destination |
|------|-------------|
| `hooks/AsyncHookRegistry.ts` | `src/hooks-system/AsyncHookRegistry.ts` |
| `hooks/apiQueryHookHelper.ts` | `src/hooks-system/apiQueryHookHelper.ts` |
| `hooks/execAgentHook.ts` | `src/hooks-system/execAgentHook.ts` |
| `hooks/execHttpHook.ts` | `src/hooks-system/execHttpHook.ts` |
| `hooks/execPromptHook.ts` | `src/hooks-system/execPromptHook.ts` |
| `hooks/fileChangedWatcher.ts` | `src/hooks-system/fileChangedWatcher.ts` |
| `hooks/hookEvents.ts` | `src/hooks-system/hookEvents.ts` |
| `hooks/hookHelpers.ts` | `src/hooks-system/hookHelpers.ts` |
| `hooks/hooksConfigManager.ts` | `src/hooks-system/hooksConfigManager.ts` |
| `hooks/hooksConfigSnapshot.ts` | `src/hooks-system/hooksConfigSnapshot.ts` |
| `hooks/hooksSettings.ts` | `src/hooks-system/hooksSettings.ts` |
| `hooks/postSamplingHooks.ts` | `src/hooks-system/postSamplingHooks.ts` |
| `hooks/registerFrontmatterHooks.ts` | `src/hooks-system/registerFrontmatterHooks.ts` |
| `hooks/registerSkillHooks.ts` | `src/hooks-system/registerSkillHooks.ts` |
| `hooks/sessionHooks.ts` | `src/hooks-system/sessionHooks.ts` |
| `hooks/skillImprovement.ts` | `src/hooks-system/skillImprovement.ts` |
| `hooks/ssrfGuard.ts` | `src/hooks-system/ssrfGuard.ts` |
| `hooks.ts` (flat, entry point) | `src/hooks-system/index.ts` |

**Cross-deps (hooks depends on all three heavy subsystems):**
`settings/settings`, `settings/constants`, `settings/types`, `permissions/permissions`, `model/model`, `shell/shellProvider`

**External consumers (44 import lines, 38 files):** `src/QueryEngine.ts`, `src/main.tsx`, `src/setup.ts`, `src/state/AppStateStore.ts`, `src/tools/AgentTool/runAgent.ts`, `src/components/hooks/` (5 components), `src/screens/REPL.tsx`

---

### 1I. True Leaf Utilities — Keep in `src/utils/` (remain unchanged)

These have no natural grouping peers and are genuinely shared primitives:

`array.ts`, `format.ts`, `stringUtils.ts`, `stringUtils.test.ts`, `path.ts`, `path.test.ts`, `hash.ts`, `uuid.ts`, `set.ts`, `semver.ts`, `json.ts`, `jsonRead.ts`, `yaml.ts`, `xml.ts`, `debounce.ts`, `memoize.ts`, `sleep.ts`, `sequential.ts`, `truncate.ts`, `treeify.ts`, `words.ts`, `intl.ts`, `objectGroupBy.ts`, `semanticBoolean.ts`, `semanticNumber.ts`, `platform.ts`, `env.ts`, `envDynamic.ts`, `envUtils.ts`, `envValidation.ts`, `errors.ts`, `log.ts`, `debug.ts`, `debugFilter.ts`, `signal.ts`, `abortController.ts`, `combinedAbortSignal.ts`, `crypto.ts`, `buffer-related` (`CircularBuffer.ts`, `bufferedWriter.ts`), `withResolvers.ts`

---

### 1J. Other Named Subdirectory Subsystems — Deferred Promotion

These have sufficient cohesion to eventually be promoted but are out of scope for ARCH-004 Phase 1:

| Subsystem | Files | Recommended Target | Rationale for Deferral |
|-----------|-------|-------------------|------------------------|
| `telemetry/` | 13 | `src/telemetry/` | Already near top-level; conflicts with existing `src/services/` taxonomy |
| `swarm/` | 22 | `src/swarm/` | Large, self-contained; promotion straightforward but separate scope |
| `computerUse/` | 15 | `src/computer-use/` | Platform feature, natural subsystem |
| `deepLink/` | 6 | `src/deep-link/` | Small, coherent; low-risk |
| `task/` | 5 | `src/task/` | Already has `src/tasks/`; namespace collision risk |
| `suggestions/` | 5 | `src/suggestions/` | Small, UI-adjacent |
| `memory/` | 2 | keep in utils/ | Too small to justify promotion |
| `mcp/` | 3 | keep in utils/ | `src/services/mcp/` already exists; would conflict |
| `git/` | 3 + flat `git.ts`, `gitDiff.ts` | `src/git/` | Future phase |
| `background/` | 2 | keep in utils/ | Too small |
| `sandbox/` | 2 | keep in utils/ | Too small |

---

### 1K. Flat Files That Remain in `src/utils/` (contextual / cross-cutting)

Session management: `sessionActivity.ts`, `sessionEnvVars.ts`, `sessionEnvironment.ts`, `sessionFileAccessHooks.ts`, `sessionIngressAuth.ts`, `sessionRestore.ts`, `sessionStart.ts`, `sessionState.ts`, `sessionStorage.ts`, `sessionStoragePortable.ts`, `sessionTitle.ts`, `sessionUrl.ts`

Config/startup: `config.ts`, `configConstants.ts`, `cliArgs.ts`, `startupProfiler.ts`, `secureStartup.ts`, `preflightChecks.tsx`, `backgroundHousekeeping.ts`

Context/agents: `agentContext.ts`, `agentId.ts`, `agentSwarmsEnabled.ts`, `analyzeContext.ts`, `contextAnalysis.ts`, `context.ts`, `forkedAgent.ts`, `standaloneAgent.ts`, `workloadContext.ts`

Messaging: `messages.ts`, `messageStream.ts`, `messageCreation.ts`, `messageMerging.ts`, `messageFiltering.ts`, `messageNormalization.ts`, `messagePredicates.ts`, `messageUtilities.ts`, `messageQueueManager.ts`, `messages.test.ts`

UI/ink: `ink.ts`, `sliceAnsi.ts`, `ansiToPng.ts`, `ansiToSvg.ts`, `theme.ts`, `systemTheme.ts`, `fullscreen.ts`, `hyperlink.ts`, `cliHighlight.ts`

File I/O: `file.ts`, `fileRead.ts`, `fileReadCache.ts`, `fileStateCache.ts`, `fileHistory.ts`, `fsOperations.ts`, `generatedFiles.ts`, `readFileInRange.ts`, `fileOperationAnalytics.ts`

All other flat files with no promotion target identified.

---

## Section 2: Dependency Graph — Confirmed Cross-Subsystem Links

```
settings/ ←──── permissions/   (CIRCULAR: must resolve before promotion)
     │                │
     │                └─── shell/ (shell imports settings)
     │
auth/ ──────────────────── model/ (model imports auth)
  │                           │
  └── settings/ ──────────────┘ (both import settings)

hooks-system/ ─→ settings/ + permissions/ + model/ + shell/
plugins/ ──────→ settings/ + permissions/ + model/ + telemetry/
```

### Confirmed circular dependencies

**Circular 1: settings ↔ permissions**
- `src/utils/settings/types.ts:9` — imports `permissions/PermissionMode`
- `src/utils/settings/validateEditTool.ts:2` — imports `permissions/filesystem`
- `src/utils/permissions/permissionsLoader.ts:9,14,15` — imports `settings/constants`, `settings/settings`, `settings/types`

**Not circular (unidirectional):**
- `model/` → `auth/` (4 files in model import auth; auth does NOT import model)
- `shell/` → `settings/` (shell imports settings; settings does NOT import shell)
- `auth/` → `settings/` (auth imports settings; settings does NOT import auth)
- `hooks-system/` → `settings/`, `permissions/`, `model/` (fan-in, no reverse)
- `plugins/` → `settings/`, `permissions/`, `model/` (fan-in, no reverse)

---

## Section 3: Migration Sequence

Order is determined by dependency direction — promote what others depend on first.

### Phase 1: Bash subsystem (lowest dependency, lowest risk)
**Order: 1**  
- No dependency on any other promoted subsystem  
- Only depends on flat `src/utils/` leaf files (stays as-is)  
- 30 import lines to update, 19 consumer files  
- **Effort: 2–3 hours**

### Phase 2: Model subsystem
**Order: 2**  
- Depends on `auth.ts` (stays in `src/utils/auth.ts` until Phase 4) — no conflict yet  
- Depends on `settings/settings` (stays in `src/utils/settings/`) — no conflict yet  
- 91 import lines to update, 80 consumer files  
- Wide breadth but purely additive (no circular risk)  
- **Effort: 3–4 hours**

### Phase 3: Settings + Permissions (must be done together)
**Order: 3 (joint promotion)**  
- Settings ↔ permissions circular must be broken via shared types extraction (see Section 6)  
- Settings has 135 import lines (119 files); permissions has 187 import lines — combined ~322 lines in 150+ files  
- Highest single-phase effort  
- **Effort: 8–12 hours** (includes circular resolution + mass import update)

### Phase 4: Auth subsystem
**Order: 4**  
- Depends on `settings/` — must come after Phase 3  
- `model/` (already promoted in Phase 2) will need import update: `src/utils/auth` → `src/auth/auth`  
- 70 import lines to update  
- **Effort: 3–4 hours**

### Phase 5: Shell subsystem
**Order: 5**  
- `shell/shellProvider.ts` imports `settings/settings` — must come after Phase 3  
- `shell/specPrefix.ts` imports `bash/` — must come after Phase 1  
- 13 import lines to update  
- **Effort: 2–3 hours**

### Phase 6: Plugins subsystem
**Order: 6**  
- Depends on settings/ (Phase 3), permissions/ (Phase 3), model/ (Phase 2)  
- All upstream dependencies promoted — clean promotion  
- 131 import lines to update, 40 consumer files  
- **Effort: 4–6 hours**

### Phase 7: Hooks subsystem
**Order: 7 (last)**  
- Depends on settings/ (Phase 3), permissions/ (Phase 3), model/ (Phase 2), shell/ (Phase 5)  
- All upstream dependencies must be promoted first  
- 44 import lines to update  
- Name collision: must choose `src/hooks-system/` or `src/event-hooks/` to avoid `src/hooks/`  
- **Effort: 2–3 hours**

---

## Section 4: Import Change Summary

| Subsystem | Import Lines to Update | Consumer Files | Risk Level |
|-----------|----------------------|----------------|------------|
| `bash/` | 30 | 19 | Low |
| `shell/` | 13 | 14 | Low |
| `auth/` | 70 | 40 | Medium |
| `permissions/` | 187 | 100+ | High |
| `plugins/` | 131 | 40 | Medium-High |
| `settings/` | 135 | 119 | High |
| `model/` | 91 | 80 | Medium |
| `hooks-system/` | 44 | 38 | Medium |
| **Total** | **701** | **~300 unique** | — |

> Note: Many files import from multiple subsystems, so unique file count is ~300, not the sum of columns.

### Regex patterns for bulk updates

```bash
# bash subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/bash/|from 'src/bash/|g"

# shell subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/shell/|from 'src/shell/|g"

# settings subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/settings/|from 'src/settings/|g"

# permissions subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/permissions/|from 'src/permissions/|g"

# model subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/model/|from 'src/model/|g"

# plugins subsystem
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/plugins/|from 'src/plugins/|g"

# hooks subsystem (example using hooks-system as target)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/hooks/|from 'src/hooks-system/|g"

# auth flat files (more surgical - only exact matches)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s|from '.*utils/auth\.js'|from 'src/auth/auth.js'|g" && \
  "s|from '.*utils/aws\.js'|from 'src/auth/aws.js'|g" && \
  "s|from '.*utils/awsAuthStatusManager\.js'|from 'src/auth/awsAuthStatusManager.js'|g"
```

> **Caution:** Run sed patterns against a dry-run first (`grep -r` to verify pattern matches before mutating). The `.js` extensions in import paths are a TypeScript ESM convention — preserve them.

---

## Section 5: Risk Assessment per Subsystem

| Subsystem | Risk | Root Cause | Mitigation |
|-----------|------|-----------|------------|
| `bash/` | **Low** | Self-contained, few consumers, no circular deps | Run existing BashTool tests post-move |
| `shell/` | **Low-Medium** | Depends on settings; PowerShell subdir naming | Promote after settings; keep powershell/ nested |
| `auth/` | **Medium** | Deep integration with config, services/oauth, components | Move secureStorage/ together; update model/ imports |
| `permissions/` | **High** | Circular with settings; 187 import lines | Joint promotion with settings; shared types extraction |
| `settings/` | **High** | 119 consumer files; circular with permissions | Joint promotion; see Section 6 for circular resolution |
| `model/` | **Medium** | 80 consumers; cross-deps on auth + settings | Promote before auth; auth stays in utils/ during model phase |
| `plugins/` | **Medium-High** | 44 files; fans out to many services and tools | All upstream promoted first; large surface area |
| `hooks-system/` | **Medium** | Name collision with `src/hooks/`; fans into many subsystems | Rename to `hooks-system/` or `event-hooks/`; promote last |

---

## Section 6: Circular Dependency Resolution — settings ↔ permissions

The `settings/ ↔ permissions/` circular dependency is the highest-risk blocker. Three resolution strategies:

### Option A: Extract shared types to `src/types/permissions.ts` (Recommended)

Move `PermissionMode.ts` and the `PermissionMode` type used by `settings/types.ts` into a new shared location: `src/types/permissions.ts` or extend the existing `src/types/` directory.

**Before:**
- `settings/types.ts` imports `permissions/PermissionMode` ← circular
- `permissions/permissionsLoader.ts` imports `settings/types` ← circular

**After:**
- Both `settings/types.ts` and `permissions/permissionsLoader.ts` import from `src/types/permissions.ts`
- True cycle is broken

**Effort:** ~2 hours to identify all shared type surfaces and extract  
**Trade-off:** Adds a `src/types/` dependency that both settings and permissions now share

### Option B: Merge settings + permissions into one module `src/config/`

Treat the circular dependency as evidence they are the same conceptual domain. Merge both into `src/config/`.

**Trade-off:** Creates a larger module (~43 files); harder to navigate; loses the conceptual boundary between "what permissions exist" and "where settings are stored"

### Option C: Keep the circular dependency with barrel re-exports

Leave the circular import as-is (Node.js/ESM handles most circular imports at runtime via lazy evaluation). Only problematic if initialization order matters.

**Trade-off:** Technical debt persists; TypeScript may emit circular reference warnings; confusing for future maintainers

**Recommendation: Option A.** Extract `PermissionMode` and any other shared type primitives to `src/types/`. This is the minimal-invasive resolution and aligns with the existing `src/types/` directory already present.

---

## Section 7: Test Strategy

### Existing test coverage in utils/

| Test File | Subsystem | Coverage |
|-----------|-----------|----------|
| `utils/authValidation.test.ts` | auth/ | Validates token format, credential parsing |
| `utils/editor.test.ts` | (stays in utils/) | Editor utility functions |
| `utils/errorClassification.test.ts` | (stays in utils/) | Error type classification |
| `utils/messages.test.ts` | (stays in utils/) | Message utilities |
| `utils/path.test.ts` | (stays in utils/) | Path normalization |
| `utils/stringUtils.test.ts` | (stays in utils/) | String utilities |
| `utils/shell/__tests__/externalCommandValidation.test.ts` | shell/ | Shell validation |

### Test gaps to fill before migration

1. **permissions/**: No tests found. Add unit tests for `permissionsLoader.ts` (circular dep resolution point) before moving.
2. **settings/**: No tests found. Add tests for `settings.ts` read/write and `types.ts` schema validation.
3. **model/**: No tests found. Add unit tests for `validateModel.ts` and `modelCapabilities.ts`.
4. **bash/**: No tests found. Add tests for `bashParser.ts` and `ast.ts` before move.

### Test verification protocol per phase

For each subsystem promotion:
1. Before move: run `tsc --noEmit` → baseline 0 errors
2. Move files, update imports
3. Run `tsc --noEmit` → must return 0 errors before continuing
4. Run existing test suite: `bun test` (or equivalent)
5. Run integration smoke test: CLI startup + basic command execution
6. Only then declare phase complete

---

## Section 8: Rollback Plan

### Per-phase rollback (git-based)

Each phase should be a single atomic git commit with message format:
```
refactor(arch-004): promote utils/<subsystem>/ to src/<subsystem>/
```

To revert a phase:
```bash
git revert <commit-hash>
```

This restores all moved files and reverted imports atomically.

### Pre-migration snapshot

Before Phase 1, create a tag:
```bash
git tag arch-004-pre-migration
```

Full rollback:
```bash
git checkout arch-004-pre-migration
```

### Re-export shim strategy (for staged rollout in production)

If a phase causes runtime regressions but reverting the full commit is too disruptive, add a re-export shim at the old path:

```typescript
// src/utils/bash/ast.ts  (shim — temporary)
export * from 'src/bash/ast.js'
```

This allows old import paths to continue working while the new path is debugged. Remove shims in a follow-up commit once stable.

---

## Section 9: Effort Summary

| Phase | Subsystem | Files Moved | Import Lines | Estimated Hours |
|-------|-----------|-------------|-------------|-----------------|
| 1 | bash/ | 23 | 30 | 2–3 |
| 2 | model/ | 17 | 91 | 3–4 |
| 3 | settings/ + permissions/ | 43 | 322 | 8–12 |
| 4 | auth/ + secureStorage/ | 13 | 70 | 3–4 |
| 5 | shell/ + Shell.ts + ShellCommand.ts | 16 | 13 | 2–3 |
| 6 | plugins/ | 44 | 131 | 4–6 |
| 7 | hooks-system/ | 18 | 44 | 2–3 |
| **Total** | **7 phases** | **~174 files** | **~701 lines** | **24–35 hours** |

> Estimate assumes: one engineer, TypeScript compiler as verification oracle, no unexpected runtime-only import resolution issues. Add 20% contingency for circular dep resolution in Phase 3.

---

## Section 10: What Stays in `src/utils/` After Promotion

After all 7 phases complete, `src/utils/` will contain approximately 416 files organized around:
- Leaf utilities (array, format, string, etc.)
- Session management (~12 files)
- Messaging (~12 files)
- Context and agent management (~10 files)
- Config and startup (~8 files)
- File I/O (~9 files)
- UI/ink primitives (~10 files)
- Remaining named subdirs deferred to Phase 2 (telemetry, swarm, computerUse, etc.)

The remaining flat files in `src/utils/` should be audited in a follow-on ARCH-005 initiative to identify further grouping candidates.

---

## Appendix A: Full Import Path Conversion Table

| Old Import | New Import |
|-----------|-----------|
| `src/utils/bash/ast` | `src/bash/ast` |
| `src/utils/bash/bashParser` | `src/bash/bashParser` |
| `src/utils/bash/commands` | `src/bash/commands` |
| `src/utils/bash/heredoc` | `src/bash/heredoc` |
| `src/utils/bash/ParsedCommand` | `src/bash/ParsedCommand` |
| `src/utils/bash/parser` | `src/bash/parser` |
| `src/utils/bash/prefix` | `src/bash/prefix` |
| `src/utils/bash/registry` | `src/bash/registry` |
| `src/utils/bash/shellCompletion` | `src/bash/shellCompletion` |
| `src/utils/bash/shellPrefix` | `src/bash/shellPrefix` |
| `src/utils/bash/shellQuote` | `src/bash/shellQuote` |
| `src/utils/bash/shellQuoting` | `src/bash/shellQuoting` |
| `src/utils/bash/ShellSnapshot` | `src/bash/ShellSnapshot` |
| `src/utils/bash/specs/*` | `src/bash/specs/*` |
| `src/utils/bash/treeSitterAnalysis` | `src/bash/treeSitterAnalysis` |
| `src/utils/bash/bashPipeCommand` | `src/bash/bashPipeCommand` |
| `src/utils/shell/bashProvider` | `src/shell/bashProvider` |
| `src/utils/shell/externalCommandValidation` | `src/shell/externalCommandValidation` |
| `src/utils/shell/outputLimits` | `src/shell/outputLimits` |
| `src/utils/shell/readOnlyCommandValidation` | `src/shell/readOnlyCommandValidation` |
| `src/utils/shell/resolveDefaultShell` | `src/shell/resolveDefaultShell` |
| `src/utils/shell/shellProvider` | `src/shell/shellProvider` |
| `src/utils/shell/shellToolUtils` | `src/shell/shellToolUtils` |
| `src/utils/shell/specPrefix` | `src/shell/specPrefix` |
| `src/utils/Shell` | `src/shell/Shell` |
| `src/utils/ShellCommand` | `src/shell/ShellCommand` |
| `src/utils/shellConfig` | `src/shell/shellConfig` |
| `src/utils/auth` | `src/auth/auth` |
| `src/utils/authFileDescriptor` | `src/auth/authFileDescriptor` |
| `src/utils/authPortable` | `src/auth/authPortable` |
| `src/utils/authValidation` | `src/auth/authValidation` |
| `src/utils/aws` | `src/auth/aws` |
| `src/utils/awsAuthStatusManager` | `src/auth/awsAuthStatusManager` |
| `src/utils/secureStorage/*` | `src/auth/secureStorage/*` |
| `src/utils/permissions/*` | `src/permissions/*` |
| `src/utils/plugins/*` | `src/plugins/*` |
| `src/utils/settings/*` | `src/settings/*` |
| `src/utils/model/*` | `src/model/*` |
| `src/utils/modelCost` | `src/model/modelCost` |
| `src/utils/hooks/*` | `src/hooks-system/*` |
| `src/utils/hooks` | `src/hooks-system/index` |

