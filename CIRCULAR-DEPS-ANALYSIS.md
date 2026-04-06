# CIRCULAR-DEPS-ANALYSIS.md
## ARCH-003: Circular Dependency Graph — Full Analysis

Generated: 2026-04-06  
Tool: `npx madge --circular --extensions ts,tsx --json src/`  
Source files scanned: 2,052  
Warnings during scan: 603 (mostly unresolved imports)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total circular dependency cycles detected | **1,234** |
| Unique files involved in at least one cycle | **783** |
| Files appearing in 500+ cycles ("hub" files) | **56** |
| Direct mutual imports (length-2 cycles) | **167** |
| Length-3 cycles | **59** |
| Self-contained cycles (no hub files) | **428** |

The codebase has a **massively entangled dependency graph**. The 1,234 reported cycles are largely combinatorial: a small number of heavily interconnected "hub" files (especially `components/permissions/PermissionRequest.tsx` at 721 cycles, `hooks/useCanUseTool.tsx` at 694, etc.) cause most of the reported count via transitive path multiplication. The true root issues are concentrated in ~15 structural problem areas described below.

---

## Part 1: Documented Workarounds (Lazy `require()` Hacks)

These are currently-active workarounds where circular dependencies are broken at runtime via deferred `require()` calls instead of static imports.

### 1.1 `src/main.tsx` — Lines 68–81 (and scattered through file)

```typescript
// Lazy require to avoid circular dependency: teammate.ts -> AppState.tsx -> ... -> main.tsx
const getTeammateUtils = () => require('./utils/teammate.js')
const getTeammatePromptAddendum = () => require('./utils/swarm/teammatePromptAddendum.js')
const getTeammateModeSnapshot = () => require('./utils/swarm/backends/teammateModeSnapshot.js')

// Feature-gated conditional requires (also cycle-breaking)
const coordinatorModeModule = feature('COORDINATOR_MODE') ? require('./coordinator/coordinatorMode.js') : null;
const assistantModule = feature('ASSISTANT_MODE') ? require('./assistant/index.js') : null;
const assistantModeGate = feature('ASSISTANT_MODE') ? require('./assistant/gate.js') : null;
```

Additional lazy `require()` calls scattered in main.tsx:
- Line 212: `require('./utils/permissions/autoModeState.js')`
- Line 1745, 1748, 2200, 2213: `require('./tools/BriefTool/BriefTool.js')`
- Line 2934: `require('./bridge/bridgeEnabled.js')`
- Line 4627: `require('./proactive/index.js')`
- Line 4650: `require('./tools/BriefTool/BriefTool.js')`

**Cycle being broken:** `main.tsx` → `utils/teammate.ts` → `state/AppState.tsx` → ... → `main.tsx`  
**Confirmed by madge:** `interactiveHelpers.tsx <-> main.tsx` and `dialogLaunchers.tsx > interactiveHelpers.tsx > main.tsx`

### 1.2 `src/services/compact/microCompact.ts` — Line 32–36

```typescript
// Inline from utils/toolResultStorage.ts — importing that file pulls in
// sessionStorage → utils/messages → services/api/errors, completing a
// circular-deps loop back through this file via promptCacheBreakDetection.
// Drift is caught by a test asserting equality with the source-of-truth.
export const TIME_BASED_MC_CLEARED_MESSAGE = '[Old tool result content cleared]'
```

**Cycle being broken:** `microCompact.ts` → `utils/toolResultStorage.ts` → `utils/sessionStorage.ts` → `utils/messages.ts` → `services/api/errors.ts` → back to `microCompact.ts`  
**Confirmed by madge:** `services/api/claude.ts > services/compact/microCompact.ts > services/tokenEstimation.ts`  
**Strategy used:** Constant inlining with a drift-detection test.

### 1.3 `src/services/api/claude.ts` — Lines 104–107

```typescript
/* eslint-disable @typescript-eslint/no-require-imports */
const autoModeStateModule = feature('TRANSCRIPT_CLASSIFIER')
  ? (require('../../utils/permissions/autoModeState.js') as typeof import(...))
  : null
```

**Cycle being broken:** `services/api/claude.ts` ↔ `services/claudeAiLimits.ts` (confirmed mutual import)

### 1.4 `src/commands.ts` — Lines 50–120

```typescript
? require('./commands/agents-platform/index.js').default
? require('./commands/proactive.js').default
? require('./commands/brief.js').default
? require('./commands/assistant/index.js').default
// ... 10+ more conditional requires
```

**Cycle being broken:** `commands.ts` has 153 direct mutual cycles (one per command file). All command files import from `commands.ts` for shared types while `commands.ts` imports them for registration.

### 1.5 `src/memdir/memdir.ts` — Lines 8, 108

```typescript
? (require('./teamMemPaths.js') as typeof import('./teamMemPaths.js'))
...
? (require('./teamMemPrompts.js') as typeof import('./teamMemPrompts.js'))
```

**Cycle being broken:** `memdir/memdir.ts <-> memdir/teamMemPrompts.ts` (confirmed mutual import)

### 1.6 `src/tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts` — Lines 53–56

```typescript
? (require('../../utils/permissions/autoModeState.js') ...)
? (require('../../utils/permissions/permissionSetup.js') ...)
```

### 1.7 `src/tools/AgentTool/builtInAgents.ts` — Line 39

```typescript
require('../../coordinator/workerAgent.js')
```

### 1.8 `src/bridge/trustedDevice.ts` — Line 123

```typescript
require('../utils/auth.js')
```

**Cycle being broken:** Part of the `utils/auth.ts > services/mockRateLimits.ts > services/claudeAiLimits.ts` triangle

### 1.9 `src/constants/product.ts` — Line 71

```typescript
require('../bridge/sessionIdCompat.js')
```

### 1.10 `src/constants/prompts.ts` — Lines 68–96 (5 lazy requires)

```typescript
require('../services/compact/cachedMCConfig.js')
require('../proactive/index.js')
require('../tools/BriefTool/prompt.js')
require('../tools/BriefTool/BriefTool.js')
require('../services/skillSearch/featureCheck.js')
```

### 1.11 `src/tools/SkillTool/SkillTool.ts` — Lines 107–110

```typescript
require('../../services/skillSearch/remoteSkillState.js')
require('../../services/skillSearch/remoteSkillLoader.js')
require('../../services/skillSearch/telemetry.js')
require('../../services/skillSearch/featureCheck.js')
```

### 1.12 `src/tools/AgentTool/AgentTool.tsx` — Line 60

```typescript
const briefModeModule = feature('BRIEF_MODE') || feature('ASSISTANT_MODE')
  ? require('../../proactive/index.js') : null;
```

### 1.13 Additional documented lazy requires

| File | Line | Require target |
|------|------|----------------|
| `tools/AgentTool/runAgent.ts` | 851 | `tasks/MonitorMcpTask/MonitorMcpTask.js` |
| `tools/ToolSearchTool/prompt.ts` | 79 | `tools/AgentTool/forkSubagent.js` |
| `tools/SendMessageTool/SendMessageTool.ts` | 759, 778 | `bridge/peerSessions.js`, `utils/udsClient.js` |
| `bridge/initReplBridge.ts` | 480 | `assistant/index.js` |

---

## Part 2: All Circular Dependency Cycles by Structural Group

### GROUP A: `commands.ts` ↔ Command Files (153 length-2 + ~80 longer cycles)

**Root cause:** `commands.ts` imports all command modules for registration; each command module imports from `commands.ts` for shared types (`CommandContext`, etc.).

**Files involved (sample):**
```
commands.ts <-> commands/add-dir/index.ts
commands.ts <-> commands/advisor.ts
commands.ts <-> commands/agents/index.ts
commands.ts <-> commands/branch/index.ts
... (55+ command files)
commands.ts <-> commands/vim/index.ts
```

**Workarounds in place:** Conditional `require()` for feature-gated commands (agents-platform, proactive, brief, assistant, bridge, voice, workflows, etc.)

---

### GROUP B: `services/api/claude.ts` ↔ `services/claudeAiLimits.ts` (Core API Triangle)

**Cycles:**
```
services/claudeAiLimits.ts <-> services/api/claude.ts           [length 2]
services/claudeAiLimits.ts <-> services/rateLimitMessages.ts    [length 2]
services/claudeAiLimits.ts > services/api/claude.ts > services/api/errors.ts [length 3]
utils/auth.ts > services/mockRateLimits.ts > services/claudeAiLimits.ts      [length 3]
utils/auth.ts > services/mockRateLimits.ts > services/claudeAiLimits.ts > services/api/claude.ts [length 4]
```

**Files in SCC:** `services/api/claude.ts`, `services/claudeAiLimits.ts`, `services/rateLimitMessages.ts`, `services/mockRateLimits.ts`, `utils/auth.ts`, `services/api/errors.ts`

**Workarounds in place:** `require()` in `claude.ts` for `autoModeState`; constant inlining in `microCompact.ts`

---

### GROUP C: `services/api/claude.ts` → `services/compact/microCompact.ts` → Back (Compact Triangle)

```
services/api/claude.ts > services/compact/microCompact.ts > services/tokenEstimation.ts [length 3]
```

**Workaround in place:** Constant `TIME_BASED_MC_CLEARED_MESSAGE` inlined in `microCompact.ts` (documented comment at line 32)

---

### GROUP D: `utils/slowOperations.ts` ↔ `utils/debug.ts` (Utility Pair)

```
utils/slowOperations.ts <-> utils/debug.ts    [length 2]
utils/fsOperations.ts > utils/slowOperations.ts > utils/debug.ts  [length 3]
```

**No workaround in place** — this is a live mutual import.

---

### GROUP E: `utils/config.ts` ↔ `utils/model/model.ts` (Config/Model Cluster)

```
utils/config.ts <-> utils/model/modelOptions.ts           [length 2]
utils/context.ts <-> utils/model/model.ts                 [length 2]
utils/model/model.ts <-> utils/model/modelAllowlist.ts    [length 2]
utils/model/model.ts <-> utils/modelCost.ts               [length 2]
utils/config.ts > utils/model/modelOptions.ts > utils/context.ts              [length 3]
utils/config.ts > utils/model/modelOptions.ts > utils/model/check1mAccess.ts  [length 3]
utils/model/model.ts > utils/model/modelAllowlist.ts > utils/model/modelStrings.ts > utils/model/configs.ts [length 4]
```

**No workarounds in place** — all live mutual imports.

---

### GROUP F: `utils/sessionStorage.ts` ↔ Multiple Utilities

```
utils/sessionStorage.ts <-> utils/fileHistory.ts      [length 2]
utils/sessionStorage.ts <-> utils/gracefulShutdown.ts [length 2]
utils/sessionStorage.ts <-> utils/toolResultStorage.ts [length 2]
```

**Workaround partially in place:** `microCompact.ts` inlines constant to avoid `toolResultStorage.ts` import chain.

---

### GROUP G: `utils/auth.ts` — Central Auth Hub

`utils/auth.ts` appears in numerous cycles because it imports from services (rate limits, API) while being imported by almost everything for authentication checks.

**Key cycles:**
```
utils/auth.ts > services/mockRateLimits.ts > services/claudeAiLimits.ts
utils/auth.ts > services/mockRateLimits.ts > services/claudeAiLimits.ts > services/api/claude.ts
```

---

### GROUP H: `ink/` — Ink Rendering Engine Internal Cycles

```
ink/dom.ts <-> ink/focus.ts           [length 2]
ink/dom.ts <-> ink/node-cache.ts      [length 2]
ink/dom.ts <-> ink/squash-text-nodes.ts [length 2]
ink/styles.ts <-> ink/render-border.ts  [length 2]
ink/instances.ts <-> ink/ink.tsx        [length 2]
ink/styles.ts > ink/render-border.ts > ink/colorize.ts   [length 3]
ink/frame.ts > ink/render-node-to-output.ts > ink/terminal.ts [length 3]
ink/dom.ts > ink/squash-text-nodes.ts > ink/styles.ts > ink/render-border.ts [length 4]
```

**No workarounds in place.** Internal module structure issue in the bundled ink library.

---

### GROUP I: Tool Implementation ↔ UI Pairs (~20 length-2 cycles)

A structural pattern where every tool has a mutual import between its logic and UI files:

```
tools/BashTool/BashTool.tsx <-> tools/BashTool/bashPermissions.ts  [+ shouldUseSandbox]
tools/FileReadTool/FileReadTool.ts <-> tools/FileReadTool/UI.tsx
tools/FileWriteTool/FileWriteTool.ts <-> tools/FileWriteTool/UI.tsx
tools/NotebookEditTool/NotebookEditTool.ts <-> tools/NotebookEditTool/UI.tsx
tools/ConfigTool/ConfigTool.ts <-> tools/ConfigTool/UI.tsx
tools/EnterPlanModeTool/EnterPlanModeTool.ts <-> tools/EnterPlanModeTool/UI.tsx
tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts <-> tools/ExitPlanModeTool/UI.tsx
tools/EnterWorktreeTool/EnterWorktreeTool.ts <-> tools/EnterWorktreeTool/UI.tsx
tools/ExitWorktreeTool/ExitWorktreeTool.ts <-> tools/ExitWorktreeTool/UI.tsx
tools/LSPTool/LSPTool.ts <-> tools/LSPTool/UI.tsx
tools/MCPTool/MCPTool.ts <-> tools/MCPTool/UI.tsx
tools/PowerShellTool/PowerShellTool.tsx <-> tools/PowerShellTool/UI.tsx
tools/SendMessageTool/SendMessageTool.ts <-> tools/SendMessageTool/UI.tsx
tools/SkillTool/SkillTool.ts <-> tools/SkillTool/UI.tsx
tools/TaskStopTool/TaskStopTool.ts <-> tools/TaskStopTool/UI.tsx
tools/BriefTool/BriefTool.ts <-> tools/BriefTool/UI.tsx
tools/WebFetchTool/WebFetchTool.ts <-> tools/WebFetchTool/UI.tsx
tools/WebSearchTool/WebSearchTool.ts <-> tools/WebSearchTool/UI.tsx
tools/RemoteTriggerTool/RemoteTriggerTool.ts <-> tools/RemoteTriggerTool/UI.tsx
tools/ScheduleCronTool/CronCreateTool.ts <-> tools/ScheduleCronTool/UI.tsx  [+ CronDelete, CronList]
```

**Pattern:** Tool implementation imports UI for rendering; UI imports tool for type/constant access.

---

### GROUP J: `tools.ts` ↔ `tools/AgentTool/AgentTool.tsx` (Tool Registry)

```
tools.ts <-> tools/AgentTool/AgentTool.tsx     [length 2]
tools/AgentTool/AgentTool.tsx > services/AgentSummary/agentSummary.ts > tools/AgentTool/runAgent.ts > utils/processUserInput/processSlashCommand.tsx [length 4]
tools/AgentTool/AgentTool.tsx > services/AgentSummary/agentSummary.ts > tools/AgentTool/runAgent.ts > utils/processUserInput/processSlashCommand.tsx > tools/AgentTool/UI.tsx [length 5]
```

---

### GROUP K: `state/AppState.tsx` ↔ Settings/Hooks Chain

```
state/AppState.tsx <-> utils/settings/applySettingsChange.ts    [length 2]
state/AppState.tsx > hooks/useSettingsChange.ts > utils/settings/changeDetector.ts > utils/hooks.ts [length 4]
state/AppState.tsx > hooks/useSettingsChange.ts > utils/settings/changeDetector.ts > utils/hooks.ts > types/hooks.ts [length 5]
```

---

### GROUP L: `utils/hooks.ts` ↔ Hooks Subsystem

```
utils/hooks.ts <-> utils/attachments.ts          [length 2]
utils/hooks.ts <-> utils/hooks/execAgentHook.ts  [length 2]
utils/hooks.ts <-> utils/hooks/execPromptHook.ts [length 2]
utils/hooks/sessionHooks.ts <-> utils/hooks/hooksSettings.ts [length 2]
hooks/toolPermission/permissionLogging.ts <-> hooks/toolPermission/PermissionContext.ts [length 2]
```

---

### GROUP M: `utils/plugins/` — Plugin System Cluster

```
utils/plugins/installedPluginsManager.ts <-> utils/plugins/marketplaceManager.ts  [length 2]
utils/plugins/marketplaceManager.ts <-> utils/plugins/marketplaceHelpers.ts        [length 2]
utils/plugins/pluginLoader.ts <-> utils/plugins/installedPluginsManager.ts         [length 2]
tools/AgentTool/loadAgentsDir.ts <-> utils/plugins/loadPluginAgents.ts             [length 2]
utils/plugins/installedPluginsManager.ts > utils/plugins/marketplaceManager.ts > utils/plugins/cacheUtils.ts [length 3]
utils/plugins/pluginLoader.ts > utils/plugins/installedPluginsManager.ts > utils/plugins/marketplaceManager.ts > utils/plugins/cacheUtils.ts [length 4]
```

---

### GROUP N: `services/analytics/growthbook.ts` ↔ Analytics Chain

```
services/analytics/growthbook.ts <-> services/analytics/firstPartyEventLogger.ts [length 2]
```

Part of longer chains:
```
services/analytics/growthbook.ts > services/analytics/firstPartyEventLogger.ts > services/analytics/firstPartyEventLoggingExporter.ts > services/analytics/metadata.ts > utils/agentContext.ts > utils/agentSwarmsEnabled.ts
```

---

### GROUP O: `screens/REPL.tsx` ↔ Components/Hooks

```
screens/REPL.tsx <-> components/Messages.tsx        [length 2]
screens/REPL.tsx <-> hooks/useCancelRequest.ts      [length 2]
screens/REPL.tsx <-> hooks/useGlobalKeybindings.tsx [length 2]
screens/REPL.tsx > components/Messages.tsx > components/MessageRow.tsx [length 3]
```

---

### GROUP P: `utils/swarm/` — Swarm Backends

```
utils/swarm/backends/registry.ts <-> utils/swarm/backends/ITermBackend.ts   [length 2]
utils/swarm/backends/registry.ts <-> utils/swarm/backends/TmuxBackend.ts    [length 2]
utils/swarm/backends/registry.ts > utils/swarm/backends/PaneBackendExecutor.ts > utils/swarm/teammateLayoutManager.ts [length 3]
utils/swarm/teamHelpers.ts > utils/swarm/backends/registry.ts > utils/swarm/backends/InProcessBackend.ts > tasks/InProcessTeammateTask/InProcessTeammateTask.tsx > utils/swarm/spawnInProcess.ts [length 5]
```

---

### GROUP Q: `services/mcp/` — MCP Client/Config

```
services/mcp/utils.ts <-> services/mcp/config.ts  [length 2]
utils/ide.ts <-> services/mcp/client.ts            [length 2]
```

---

### GROUP R: Other Notable Length-2 Cycles

```
utils/git.ts <-> utils/detectRepository.ts
utils/git.ts <-> utils/git/gitFilesystem.ts
utils/file.ts <-> utils/fileReadCache.ts
utils/stats.ts <-> utils/statsCache.ts
utils/toolSearch.ts <-> utils/analyzeContext.ts
utils/processUserInput/processUserInput.ts <-> utils/processUserInput/processBashCommand.tsx
services/tools/toolExecution.ts <-> services/tools/toolHooks.ts
services/PromptSuggestion/speculation.ts <-> services/PromptSuggestion/promptSuggestion.ts
memdir/memdir.ts <-> memdir/teamMemPrompts.ts
utils/nativeInstaller/installer.ts <-> utils/nativeInstaller/download.ts
skills/loadSkillsDir.ts <-> skills/mcpSkillBuilders.ts
utils/bash/registry.ts <-> utils/bash/specs/index.ts
components/FullscreenLayout.tsx <-> components/VirtualMessageList.tsx
components/Messages.tsx <-> components/MessageRow.tsx
tasks/LocalAgentTask/LocalAgentTask.tsx <-> tasks/types.ts
utils/attachments.ts <-> context_guide/guidance_prompts.ts
constants/outputStyles.ts <-> outputStyles/loadOutputStylesDir.ts
components/permissions/PermissionRequest.tsx <-> [10+ permission request components]
```

---

## Part 3: Hub Files — Highest Impact Targets

These 10 files appear in 500+ cycles each. Breaking any one of them from the main SCC would eliminate hundreds of reported cycles.

| Cycles | File | Role |
|--------|------|------|
| 721 | `components/permissions/PermissionRequest.tsx` | Permission UI dispatcher |
| 694 | `hooks/useCanUseTool.tsx` | Tool permission hook |
| 679 | `types/command.ts` | Shared command types |
| 675 | `services/mcp/client.ts` | MCP client singleton |
| 672 | `skills/bundledSkills.ts` | Skills registry |
| 671 | `types/plugin.ts` | Plugin type definitions |
| 667 | `utils/ide.ts` | IDE integration |
| 663 | `tools/BashTool/BashTool.tsx` | Bash tool implementation |
| 661 | `query.ts` | Query entry point |
| 660 | `tasks/LocalShellTask/LocalShellTask.tsx` | Shell task runner |

---

## Part 4: Proposed Breaking Strategies Per Group

### Strategy A: Extract Shared Types to Leaf Modules (no deps)

**Applies to:** GROUP A (commands), GROUP B (API), GROUP E (config/model), GROUP I (Tool/UI pairs)

Create type-only or constant-only files with zero imports that both sides depend on instead of each other.

**Example — GROUP I (Tool/UI pairs):**
- Problem: `FileReadTool.ts` imports `UI.tsx` for rendering; `UI.tsx` imports `FileReadTool.ts` for types
- Fix: Extract `FileReadTool.types.ts` with shared interfaces; both `FileReadTool.ts` and `UI.tsx` import from the types file
- No lazy require needed; clean static imports

**Example — GROUP A (commands.ts):**
- Problem: Every command file imports `CommandContext` from `commands.ts`; `commands.ts` imports all commands
- Fix: Move `CommandContext` and other shared types to `types/command.ts` (already exists but itself in cycles); then `commands.ts` imports commands without providing types back

---

### Strategy B: Introduce Interface/Types Barrel (for hub files)

**Applies to:** GROUP K (AppState), GROUP L (hooks), GROUP N (analytics)

When a hub file is needed for its types by lower-level modules, split it:
- `AppState.types.ts` — pure types, no runtime deps
- `AppState.tsx` — runtime, imports from `.types.ts`
- Lower modules import from `AppState.types.ts` only

---

### Strategy C: Dependency Inversion / Event Bus

**Applies to:** GROUP B (API ↔ claudeAiLimits), GROUP C (claude ↔ microCompact)

Where two service modules genuinely need each other at runtime:
- Extract a shared interface or callback registration pattern
- The lower module registers a callback; the upper module calls it
- Eliminates the import direction

**Example — `claudeAiLimits.ts <-> services/api/claude.ts`:**
- `claudeAiLimits.ts` should only observe quota headers — it doesn't need to import `claude.ts`
- `claude.ts` calls `claudeAiLimits.extractQuotaStatusFromHeaders()` after API responses
- Move quota extraction to a separate `services/api/quotaObserver.ts` that both can import

---

### Strategy D: Index Barrel Consolidation

**Applies to:** GROUP M (plugins), GROUP P (swarm backends), GROUP H (ink)

Replace registry → implementation cycles with a proper registry pattern:
- Registry file imports an interface only
- Each implementation registers itself lazily or is loaded via an index barrel
- `utils/swarm/backends/registry.ts` should declare an interface; `ITermBackend.ts` imports the interface, not the registry

---

### Strategy E: Lazy Import (already used — formalize)

**Applies to:** Remaining cycles where runtime circular access is unavoidable

Formalize the existing `require()` hack pattern into a consistent `lazyImport<T>()` utility that:
1. Is type-safe (no `as typeof import(...)` casting)
2. Is memoized (only calls `require()` once)
3. Is self-documenting (includes the cycle reason as a required parameter)

---

### Strategy F: Move Constants Out of Circular Files

**Applies to:** GROUP D (`slowOperations` ↔ `debug`), GROUP F (`sessionStorage` ↔ utilities)

Constant values that happen to be defined in large hub files can be moved to small standalone files with no imports. The `microCompact.ts` workaround (inlining `TIME_BASED_MC_CLEARED_MESSAGE`) is an example of this already working.

---

## Part 5: Refactoring Roadmap — Lowest to Highest Risk

### Phase 1 — Quick Wins, No Behavior Change (Risk: LOW)

These cycles are purely structural and can be fixed without touching business logic.

| Priority | Cycle Group | Fix | Files Changed |
|----------|-------------|-----|---------------|
| 1 | GROUP I: Tool ↔ UI pairs (20 cycles) | Extract `*.types.ts` per tool | ~40 files, mechanical |
| 2 | GROUP D: `slowOperations` ↔ `debug` | Move shared log utils to `utils/logUtils.ts` | 2–3 files |
| 3 | GROUP H: `ink/` internal cycles | Linearize ink module deps (dom→focus→styles→render) | 8–10 files |
| 4 | GROUP R: Simple utility pairs (`git`, `file`, `stats`, etc.) | Extract shared types to leaf file | ~16 files, 2 each |

**Estimated cycles eliminated:** ~250  
**Risk:** Very low — no logic changes, only import restructuring

---

### Phase 2 — Type Extraction (Risk: LOW-MEDIUM)

Extract shared type definitions from hub files.

| Priority | Cycle Group | Fix | Files Changed |
|----------|-------------|-----|---------------|
| 5 | GROUP A: `commands.ts` ↔ commands (153 cycles) | Move `CommandContext` + shared types to `types/command.ts` (deduplicate) | commands.ts + 55+ command files |
| 6 | GROUP K: `AppState.tsx` ↔ settings | Create `state/AppState.types.ts` | 3–5 files |
| 7 | GROUP L: `utils/hooks.ts` ↔ hooks subsystem | Create `types/hooks.ts` properly (already partially exists) | 5 files |

**Estimated cycles eliminated:** ~300  
**Risk:** Low-medium — requires updating many import paths but no logic changes

---

### Phase 3 — Service Layer Restructure (Risk: MEDIUM)

Restructure mutual service dependencies using dependency inversion.

| Priority | Cycle Group | Fix | Files Changed |
|----------|-------------|-----|---------------|
| 8 | GROUP B: `claudeAiLimits` ↔ `api/claude` | Extract `services/api/quotaObserver.ts` | 4 service files |
| 9 | GROUP C: `claude.ts` → `microCompact` → back | Move `tokenEstimation` to neutral location | 3 files |
| 10 | GROUP F: `sessionStorage` ↔ utilities | Create `utils/sessionStorageTypes.ts` for constants/interfaces | 4 files |
| 11 | GROUP M: `plugins/` cluster | Registry interface + lazy loading pattern | 8 plugin files |

**Estimated cycles eliminated:** ~150  
**Risk:** Medium — service layer changes require careful integration testing

---

### Phase 4 — Hub File Decomposition (Risk: HIGH)

Decompose the highest-cycle-count hub files. These are high-impact but also high-risk because they have 500–721 dependent cycles.

| Priority | Hub File | Fix | Risk Reason |
|----------|----------|-----|-------------|
| 12 | `components/permissions/PermissionRequest.tsx` (721) | Split into `PermissionRequest.types.ts` + runtime | Central permission dispatch; runtime behavior at stake |
| 13 | `hooks/useCanUseTool.tsx` (694) | Extract tool capability interface | Widely used hook; subtle React lifecycle implications |
| 14 | `services/mcp/client.ts` (675) | Split client config from client runtime | MCP connections are stateful; split must preserve singleton |
| 15 | `tools/BashTool/BashTool.tsx` (663) | Already partially decomposed (`bashPermissions.ts`) — continue extraction | Core tool; security-sensitive permission logic |

**Estimated cycles eliminated:** 500+  
**Risk:** High — these files are central to runtime behavior. Requires comprehensive test coverage before refactoring.

---

### Phase 5 — Main Entry Point Cleanup (Risk: MEDIUM)

Fix the `main.tsx` ↔ `interactiveHelpers.tsx` ↔ `dialogLaunchers.tsx` cycle chain after Phases 1–4 reduce its depth.

| Priority | Cycle | Fix |
|----------|-------|-----|
| 16 | `interactiveHelpers.tsx <-> main.tsx` | Move shared helper types to `types/repl.ts`; main.tsx becomes a pure orchestrator |
| 17 | `dialogLaunchers.tsx > interactiveHelpers.tsx > main.tsx` | Extract dialog interfaces; launchers take callback params instead of importing main |

**Risk:** Medium — `main.tsx` is the application entry point; changes require full integration testing

---

## Part 6: madge Output Artifacts

- **`/tmp/deps-circular.json`** — Full JSON array of all 1,234 cycles (1.6MB)
- **`deps-circular.txt`** — Text output from madge run

To regenerate:
```bash
# Text output
npx madge --circular --extensions ts,tsx src/ 2>&1 | tee deps-circular.txt

# JSON for analysis
npx madge --circular --extensions ts,tsx --json src/ > /tmp/deps-circular.json 2>/dev/null

# Dot graph (if graphviz available)
npx madge --circular --extensions ts,tsx --dot src/ > /tmp/deps-circular.dot 2>/dev/null
dot -Tsvg /tmp/deps-circular.dot > deps-circular.svg
```

---

## Appendix: Cycle Count Summary

| Cycle Length | Count |
|-------------|-------|
| 2 (direct mutual) | 167 |
| 3 | 59 |
| 4 | 43 |
| 5 | 28 |
| 6–10 | 65 |
| 11–20 | 54 |
| 21–30 | 65 |
| 31–50 | 103 |
| 51–87 | 650 |
| **Total** | **1,234** |

The dominance of long cycles (51+ nodes) reflects the highly connected "super-SCC" containing the 56 hub files. Once the hub files are decoupled (Phases 3–4), most long cycles will dissolve automatically as sub-paths through the SCC are broken.
