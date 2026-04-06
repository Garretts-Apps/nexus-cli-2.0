/**
 * ShellValidationEngine — shared external-command safety helpers.
 *
 * These functions validate whether external commands (git, gh, docker, dotnet)
 * are safe to run in a read-only context. They are consumed by both
 * PowerShellTool and any future shell adapters that need cross-shell external
 * command validation.
 *
 * PowerShell-specific concern: all helpers reject args that contain `$` because
 * PowerShell expands variables at runtime while the validator only sees the
 * literal token. Bash handles this differently (blanket $ rejection upstream).
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
// Git global flag sets
// ---------------------------------------------------------------------------

export const DANGEROUS_GIT_GLOBAL_FLAGS = new Set([
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

// Git global flags that accept a separate (space-separated) value argument.
// When the loop encounters one without an inline `=` value, it must skip the
// next token so the value isn't mistaken for the subcommand.
//
// SECURITY: This set must be COMPLETE. Any value-consuming global flag not
// listed here creates a parser differential: validator sees the value as the
// subcommand, git consumes it and runs the NEXT token. Audited against
// `man git` + GIT_TRACE for git 2.51; --list-cmds is `=`-only, booleans
// (-p/--bare/--no-*/--*-pathspecs/--html-path/etc.) advance by 1 via the
// default path. --attr-source REMOVED: it also triggers pathspec parsing,
// creating a second differential — moved to DANGEROUS_GIT_GLOBAL_FLAGS above.
export const GIT_GLOBAL_FLAGS_WITH_VALUES = new Set([
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

// Git short global flags that accept attached-form values (no space between
// flag letter and value). Long options (--git-dir etc.) require `=` or space,
// so the split-on-`=` check handles them. But `-ccore.pager=sh` and `-C/path`
// need prefix matching: git parses `-c<name>=<value>` and `-C<path>` directly.
export const DANGEROUS_GIT_SHORT_FLAGS_ATTACHED = ['-c', '-C']

// ---------------------------------------------------------------------------
// dotnet safe flags
// ---------------------------------------------------------------------------

export const DOTNET_READ_ONLY_FLAGS = new Set([
  '--version',
  '--info',
  '--list-runtimes',
  '--list-sdks',
])

// ---------------------------------------------------------------------------
// External-command safety helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given git args (everything after "git") are safe.
 *
 * Rejects args containing `$` to block PowerShell variable expansion leaks.
 */
export function isGitSafe(args: string[]): boolean {
  if (args.length === 0) {
    return true
  }

  // SECURITY: Reject any arg containing `$` (variable reference). Bare
  // VariableExpressionAst positionals reach here as literal text ($env:SECRET,
  // $VAR). deriveSecurityFlags does not gate bare Variable args. The validator
  // sees `$VAR` as text; PowerShell expands it at runtime. Parser differential:
  //   git diff $VAR   where $VAR = '--output=/tmp/evil'
  //   → validator sees positional '$VAR' → validateFlags passes
  //   → PowerShell runs `git diff --output=/tmp/evil` → file write
  // This generalizes the ls-remote inline `$` guard below to all git subcommands.
  // Bash equivalent: BashTool blanket
  // `$` rejection at readOnlyValidation.ts:~1352. isGhSafe has the same guard.
  for (const arg of args) {
    if (arg.includes('$')) {
      return false
    }
  }

  // Skip over global flags before the subcommand, rejecting dangerous ones.
  // Flags that take space-separated values must consume the next token so it
  // isn't mistaken for the subcommand (e.g. `git --namespace foo status`).
  let idx = 0
  while (idx < args.length) {
    const arg = args[idx]
    if (!arg || !arg.startsWith('-')) {
      break
    }
    // SECURITY: Attached-form short flags. `-ccore.pager=sh` splits on `=` to
    // `-ccore.pager`, which isn't in DANGEROUS_GIT_GLOBAL_FLAGS. Git accepts
    // `-c<name>=<value>` and `-C<path>` with no space. We must prefix-match.
    // Note: `--cached`, `--config-env`, etc. already fail startsWith('-c') at
    // position 1 (`-` ≠ `c`). The `!== '-'` guard only applies to `-c`
    // (git config keys never start with `-`, so `-c-key` is implausible).
    // It does NOT apply to `-C` — directory paths CAN start with `-`, so
    // `git -C-trap status` must reject. `git -ccore.pager=sh log` spawns a shell.
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

  let config: ExternalCommandConfig | undefined =
    GIT_READ_ONLY_COMMANDS[twoWordKey]
  let subcommandTokens = 2

  if (!config) {
    config = GIT_READ_ONLY_COMMANDS[oneWordKey]
    subcommandTokens = 1
  }

  if (!config) {
    return false
  }

  const flagArgs = args.slice(idx + subcommandTokens)

  // git ls-remote URL rejection — ported from BashTool's inline guard
  // (src/tools/BashTool/readOnlyValidation.ts:~962). ls-remote with a URL
  // is a data-exfiltration vector (encode secrets in hostname → DNS/HTTP).
  // Reject URL-like positionals: `://` (http/git protocols), `@` + `:` (SSH
  // git@host:path), and `$` (variable refs — $env:URL reaches here as the
  // literal string '$env:URL' when the arg's elementType is Variable; the
  // security-flag checks don't gate bare Variable positionals passed to
  // external commands).
  if (first === 'ls-remote') {
    for (const arg of flagArgs) {
      if (!arg.startsWith('-')) {
        if (
          arg.includes('://') ||
          arg.includes('@') ||
          arg.includes(':') ||
          arg.includes('$')
        ) {
          return false
        }
      }
    }
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
 * Returns true if the given gh args (everything after "gh") are safe.
 *
 * Network-dependent; only allowed for internal builds.
 */
export function isGhSafe(args: string[]): boolean {
  // gh commands are network-dependent; only allow for ant users
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

  // SECURITY: Reject any arg containing `$` (variable reference). Bare
  // VariableExpressionAst positionals reach here as literal text ($env:SECRET).
  // deriveSecurityFlags does not gate bare Variable args — only subexpressions,
  // splatting, expandable strings, etc. All gh subcommands are network-facing,
  // so a variable arg is a data-exfiltration vector:
  //   gh search repos $env:SECRET_API_KEY
  //   → PowerShell expands at runtime → secret sent to GitHub API.
  // git ls-remote has an equivalent inline guard; this generalizes it for gh.
  // Bash equivalent: BashTool blanket `$` rejection at readOnlyValidation.ts:~1352.
  for (const arg of flagArgs) {
    if (arg.includes('$')) {
      return false
    }
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
 * Returns true if the given docker args (everything after "docker") are safe.
 *
 * Rejects args containing `$` to block PowerShell variable expansion leaks.
 */
export function isDockerSafe(args: string[]): boolean {
  if (args.length === 0) {
    return true
  }

  // SECURITY: blanket PowerShell `$` variable rejection. Same guard as
  // isGitSafe and isGhSafe. Parser differential: validator sees literal
  // '$env:X'; PowerShell expands at runtime. Runs BEFORE the fast-path
  // return — the previous location (after fast-path) never fired for
  // `docker ps`/`docker images`. The earlier comment claiming those take no
  // --format was wrong: `docker ps --format $env:AWS_SECRET_ACCESS_KEY`
  // auto-allowed, PowerShell expanded, docker errored with the secret in
  // its output, model read it. Check ALL args, not flagArgs — args[0]
  // (subcommand slot) could also be `$env:X`. elementTypes whitelist isn't
  // applicable here: this function receives string[] (post-stringify), not
  // ParsedCommandElement; the isAllowlistedCommand caller applies the
  // elementTypes gate one layer up.
  for (const arg of args) {
    if (arg.includes('$')) {
      return false
    }
  }

  const oneWordKey = `docker ${args[0]?.toLowerCase()}`

  // Fast path: EXTERNAL_READONLY_COMMANDS entries ('docker ps', 'docker images')
  // have no flag constraints — allow unconditionally (after $ guard above).
  if (EXTERNAL_READONLY_COMMANDS.includes(oneWordKey)) {
    return true
  }

  // DOCKER_READ_ONLY_COMMANDS entries ('docker logs', 'docker inspect') have
  // per-flag configs. Mirrors isGhSafe: look up config, then validateFlags.
  const config: ExternalCommandConfig | undefined =
    DOCKER_READ_ONLY_COMMANDS[oneWordKey]
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

/**
 * Returns true if the given dotnet args (everything after "dotnet") are safe.
 */
export function isDotnetSafe(args: string[]): boolean {
  if (args.length === 0) {
    return false
  }

  // dotnet uses top-level flags like --version, --info, --list-runtimes
  // All args must be in the safe set
  for (const arg of args) {
    if (!DOTNET_READ_ONLY_FLAGS.has(arg.toLowerCase())) {
      return false
    }
  }

  return true
}

/**
 * Dispatch function: given a command name and its args, returns true if the
 * external command invocation is read-only safe.
 */
export function isExternalCommandSafe(
  command: string,
  args: string[],
): boolean {
  switch (command) {
    case 'git':
      return isGitSafe(args)
    case 'gh':
      return isGhSafe(args)
    case 'docker':
      return isDockerSafe(args)
    case 'dotnet':
      return isDotnetSafe(args)
    default:
      return false
  }
}
