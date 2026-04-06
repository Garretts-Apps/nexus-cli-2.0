/**
 * Shared external-command safety dispatch for git, gh, and docker.
 *
 * Both BashTool and PowerShellTool perform identical safety checks on these
 * three external commands. This module consolidates the logic so both tools
 * can import a single implementation.
 *
 * SECURITY NOTES:
 * - All functions reject args containing `$` (variable-expansion differential).
 * - git ls-remote rejects URL-like positional args (data-exfiltration vector).
 * - gh commands are restricted to internal builds (INTERNAL_BUILD=1) because
 *   they make network requests.
 */

import {
  DOCKER_READ_ONLY_COMMANDS,
  EXTERNAL_READONLY_COMMANDS,
  GH_READ_ONLY_COMMANDS,
  GIT_READ_ONLY_COMMANDS,
  validateFlags,
} from './readOnlyCommandValidation.js'
import type { ExternalCommandConfig } from './readOnlyCommandValidation.js'

// ---------------------------------------------------------------------------
// Git global-flag constants
// ---------------------------------------------------------------------------

// Git global flags that are outright dangerous (code execution, path injection,
// parser-differential attacks). Rejected before subcommand lookup.
const DANGEROUS_GIT_GLOBAL_FLAGS = new Set([
  '-c',
  '-C',
  '--exec-path',
  '--config-env',
  '--git-dir',
  '--work-tree',
  // SECURITY: --attr-source creates a parser differential. Git treats the
  // token after the tree-ish value as a pathspec (not the subcommand), but
  // our skip-by-2 loop would treat it as the subcommand:
  //   git --attr-source HEAD~10 log status
  //   validator: advances past HEAD~10, sees subcmd=log → allow
  //   git:       consumes `log` as pathspec, runs `status` as the real subcmd
  // Verified with `GIT_TRACE=1 git --attr-source HEAD~10 log status` →
  // `trace: built-in: git status`. Reject outright rather than skip-by-2.
  '--attr-source',
])

// Git global flags that accept a space-separated value argument. When the
// loop encounters one WITHOUT an inline `=` value it must skip the next token
// so the value is not mistaken for the subcommand.
//
// SECURITY: This set must be COMPLETE. Any value-consuming global flag not
// listed here creates a parser differential: validator sees the value as the
// subcommand, git consumes it and runs the NEXT token.
const GIT_GLOBAL_FLAGS_WITH_VALUES = new Set([
  '-c',
  '-C',
  '--exec-path',
  '--config-env',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--super-prefix',
  '--shallow-file',
])

// Short global flags that accept attached-form values (no space between flag
// letter and value). Long options require `=` or space so split-on-`=` handles
// them. But `-ccore.pager=sh` and `-C/path` need prefix matching.
const DANGEROUS_GIT_SHORT_FLAGS_ATTACHED = ['-c', '-C']

// ---------------------------------------------------------------------------
// Shared guards
// ---------------------------------------------------------------------------

/**
 * Returns true if any arg contains `$` (variable reference).
 *
 * SECURITY: Both Bash and PowerShell expand `$VAR` at runtime. The validator
 * sees the literal string `$VAR` while the shell runs the expanded value.
 * This parser differential defeats both validateFlags and callbacks — reject
 * ANY token containing `$` before further checks.
 */
export function rejectDollarSignArgs(args: string[]): boolean {
  return args.some(arg => arg.includes('$'))
}

/**
 * Returns true if the git ls-remote subcommand receives a URL-like positional
 * argument (data-exfiltration vector: encode secrets in hostname → DNS/HTTP).
 *
 * Rejects: `://` (HTTP/git protocols), `@`+`:` (SSH git@host:path), `$`
 * (variable refs that survive as literal text through the parser).
 *
 * @param subcommand - first token after global flags, lowercased
 * @param flagArgs   - tokens after the subcommand
 */
export function rejectGitLsRemoteUrls(
  subcommand: string,
  flagArgs: string[],
): boolean {
  if (subcommand !== 'ls-remote') {
    return false
  }
  for (const arg of flagArgs) {
    if (!arg.startsWith('-')) {
      if (
        arg.includes('://') ||
        arg.includes('@') ||
        arg.includes(':') ||
        arg.includes('$')
      ) {
        return true
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Exported safety functions
// ---------------------------------------------------------------------------

/**
 * Returns true if `git <args>` is safe to run without user confirmation.
 *
 * Consolidates the identical implementations formerly duplicated in
 * BashTool/readOnlyValidation.ts and PowerShellTool/readOnlyValidation.ts.
 */
export function isExternalGitCommandSafe(args: string[]): boolean {
  if (args.length === 0) {
    return true
  }

  // SECURITY: Reject any arg containing `$` (variable reference). Bare
  // VariableExpressionAst positionals reach here as literal text ($env:SECRET,
  // $VAR). deriveSecurityFlags does not gate bare Variable args. The validator
  // sees `$VAR` as text; PowerShell/bash expands it at runtime. Parser
  // differential:
  //   git diff $VAR   where $VAR = '--output=/tmp/evil'
  //   → validator sees positional '$VAR' → validateFlags passes
  //   → shell runs `git diff --output=/tmp/evil` → file write
  if (rejectDollarSignArgs(args)) {
    return false
  }

  // Skip over global flags before the subcommand, rejecting dangerous ones.
  // Flags that take space-separated values must consume the next token so it
  // is not mistaken for the subcommand (e.g. `git --namespace foo status`).
  let idx = 0
  while (idx < args.length) {
    const arg = args[idx]
    if (!arg || !arg.startsWith('-')) {
      break
    }
    // SECURITY: Attached-form short flags. `-ccore.pager=sh` splits on `=` to
    // `-ccore.pager`, which is not in DANGEROUS_GIT_GLOBAL_FLAGS. Git accepts
    // `-c<name>=<value>` and `-C<path>` with no space. We must prefix-match.
    for (const shortFlag of DANGEROUS_GIT_SHORT_FLAGS_ATTACHED) {
      if (
        arg.length > shortFlag.length &&
        arg.startsWith(shortFlag) &&
        (shortFlag === '-C' || arg[shortFlag.length] !== '-')
      ) {
        return false
      }
    }
    const hasInlineValue = arg.includes('=')
    const flagName = hasInlineValue ? arg.split('=')[0] || '' : arg
    if (DANGEROUS_GIT_GLOBAL_FLAGS.has(flagName)) {
      return false
    }
    // Consume the next token if the flag takes a separate value
    if (!hasInlineValue && GIT_GLOBAL_FLAGS_WITH_VALUES.has(flagName)) {
      idx += 2
    } else {
      idx++
    }
  }

  if (idx >= args.length) {
    return true
  }

  // Try multi-word subcommand first (e.g. 'stash list', 'config --get', 'remote show')
  const first = args[idx]?.toLowerCase() || ''
  const second = idx + 1 < args.length ? args[idx + 1]?.toLowerCase() || '' : ''

  // GIT_READ_ONLY_COMMANDS keys are like 'git diff', 'git stash list'
  const twoWordKey = `git ${first} ${second}`
  const oneWordKey = `git ${first}`

  let config: ExternalCommandConfig | undefined = GIT_READ_ONLY_COMMANDS[twoWordKey]
  let subcommandTokens = 2

  if (!config) {
    config = GIT_READ_ONLY_COMMANDS[oneWordKey]
    subcommandTokens = 1
  }

  if (!config) {
    return false
  }

  const flagArgs = args.slice(idx + subcommandTokens)

  // git ls-remote URL rejection — encode secrets in hostname → DNS/HTTP
  // data-exfiltration vector.
  if (rejectGitLsRemoteUrls(first, flagArgs)) {
    return false
  }

  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback('', flagArgs)
  ) {
    return false
  }
  return validateFlags(flagArgs, 0, config, { commandName: 'git' })
}

/**
 * Returns true if `gh <args>` is safe to run without user confirmation.
 *
 * gh commands are network-dependent; only allow for internal builds
 * (INTERNAL_BUILD=1).
 */
export function isExternalGhCommandSafe(args: string[]): boolean {
  // gh commands are network-dependent; only allow for internal users
  if (process.env.INTERNAL_BUILD !== '1') {
    return false
  }

  if (args.length === 0) {
    return true
  }

  // Try two-word subcommand first (e.g. 'pr view')
  let config: ExternalCommandConfig | undefined
  let subcommandTokens = 0

  if (args.length >= 2) {
    const twoWordKey = `gh ${args[0]?.toLowerCase()} ${args[1]?.toLowerCase()}`
    config = GH_READ_ONLY_COMMANDS[twoWordKey]
    subcommandTokens = 2
  }

  // Try single-word subcommand (e.g. 'gh version')
  if (!config && args.length >= 1) {
    const oneWordKey = `gh ${args[0]?.toLowerCase()}`
    config = GH_READ_ONLY_COMMANDS[oneWordKey]
    subcommandTokens = 1
  }

  if (!config) {
    return false
  }

  const flagArgs = args.slice(subcommandTokens)

  // SECURITY: Reject any arg containing `$` (variable reference). All gh
  // subcommands are network-facing, so a variable arg is a data-exfiltration
  // vector:
  //   gh search repos $env:SECRET_API_KEY
  //   → shell expands at runtime → secret sent to GitHub API.
  if (rejectDollarSignArgs(flagArgs)) {
    return false
  }

  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback('', flagArgs)
  ) {
    return false
  }
  return validateFlags(flagArgs, 0, config)
}

/**
 * Returns true if `docker <args>` is safe to run without user confirmation.
 */
export function isExternalDockerCommandSafe(args: string[]): boolean {
  if (args.length === 0) {
    return true
  }

  // SECURITY: blanket `$` variable rejection. Same guard as isExternalGitCommandSafe
  // and isExternalGhCommandSafe. Parser differential: validator sees literal
  // '$env:X'; shell expands at runtime. Check ALL args, not just flagArgs —
  // args[0] (subcommand slot) could also be `$env:X`.
  if (rejectDollarSignArgs(args)) {
    return false
  }

  const oneWordKey = `docker ${args[0]?.toLowerCase()}`

  // Fast path: EXTERNAL_READONLY_COMMANDS entries ('docker ps', 'docker images')
  // have no flag constraints — allow unconditionally (after $ guard above).
  if (EXTERNAL_READONLY_COMMANDS.includes(oneWordKey)) {
    return true
  }

  // DOCKER_READ_ONLY_COMMANDS entries ('docker logs', 'docker inspect') have
  // per-flag configs.
  const config: ExternalCommandConfig | undefined = DOCKER_READ_ONLY_COMMANDS[oneWordKey]
  if (!config) {
    return false
  }

  const flagArgs = args.slice(1)

  if (
    config.additionalCommandIsDangerousCallback &&
    config.additionalCommandIsDangerousCallback('', flagArgs)
  ) {
    return false
  }
  return validateFlags(flagArgs, 0, config)
}
