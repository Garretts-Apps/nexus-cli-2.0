/**
 * Tests for shared external-command safety dispatch.
 *
 * These cases are drawn from the existing PowerShellTool and BashTool
 * readOnlyValidation implementations and cover both safe and unsafe inputs
 * for git, gh, and docker.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isExternalGitCommandSafe,
  isExternalGhCommandSafe,
  isExternalDockerCommandSafe,
  rejectDollarSignArgs,
  rejectGitLsRemoteUrls,
} from '../externalCommandValidation.js'

// ---------------------------------------------------------------------------
// rejectDollarSignArgs
// ---------------------------------------------------------------------------

describe('rejectDollarSignArgs', () => {
  it('returns false for empty array', () => {
    expect(rejectDollarSignArgs([])).toBe(false)
  })

  it('returns false for args without $', () => {
    expect(rejectDollarSignArgs(['status', '--short'])).toBe(false)
  })

  it('returns true for arg starting with $', () => {
    expect(rejectDollarSignArgs(['$VAR'])).toBe(true)
  })

  it('returns true for arg containing $ in middle', () => {
    expect(rejectDollarSignArgs(['--format=$env:SECRET'])).toBe(true)
  })

  it('returns true when only one arg has $', () => {
    expect(rejectDollarSignArgs(['status', '$HOME'])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// rejectGitLsRemoteUrls
// ---------------------------------------------------------------------------

describe('rejectGitLsRemoteUrls', () => {
  it('returns false for non-ls-remote subcommands', () => {
    expect(rejectGitLsRemoteUrls('status', [])).toBe(false)
    expect(rejectGitLsRemoteUrls('diff', ['https://example.com'])).toBe(false)
  })

  it('returns false when no positional args given', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', [])).toBe(false)
    expect(rejectGitLsRemoteUrls('ls-remote', ['--heads', '--tags'])).toBe(false)
  })

  it('returns false for local remote name (no URL chars)', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', ['origin'])).toBe(false)
    expect(rejectGitLsRemoteUrls('ls-remote', ['upstream'])).toBe(false)
  })

  it('returns true for http/https URL', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', ['https://github.com/org/repo'])).toBe(true)
    expect(rejectGitLsRemoteUrls('ls-remote', ['http://evil.com/repo'])).toBe(true)
    expect(rejectGitLsRemoteUrls('ls-remote', ['git://host/repo'])).toBe(true)
  })

  it('returns true for SSH URL with @', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', ['git@github.com:org/repo.git'])).toBe(true)
  })

  it('returns true for arg with : (scp-style SSH)', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', ['host:path/repo'])).toBe(true)
  })

  it('returns true for arg with $', () => {
    expect(rejectGitLsRemoteUrls('ls-remote', ['$URL'])).toBe(true)
  })

  it('skips flag args (starting with -)', () => {
    // --heads is a flag, should not be rejected
    expect(rejectGitLsRemoteUrls('ls-remote', ['--heads', 'origin'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isExternalGitCommandSafe
// ---------------------------------------------------------------------------

describe('isExternalGitCommandSafe', () => {
  it('returns true for empty args', () => {
    expect(isExternalGitCommandSafe([])).toBe(true)
  })

  // Known-safe subcommands
  it('allows git status', () => {
    expect(isExternalGitCommandSafe(['status'])).toBe(true)
  })

  it('allows git status --short', () => {
    expect(isExternalGitCommandSafe(['status', '--short'])).toBe(true)
  })

  it('allows git diff', () => {
    expect(isExternalGitCommandSafe(['diff'])).toBe(true)
  })

  it('allows git diff --stat HEAD', () => {
    expect(isExternalGitCommandSafe(['diff', '--stat', 'HEAD'])).toBe(true)
  })

  it('allows git log --oneline', () => {
    expect(isExternalGitCommandSafe(['log', '--oneline'])).toBe(true)
  })

  it('allows git log -n 5', () => {
    expect(isExternalGitCommandSafe(['log', '-n', '5'])).toBe(true)
  })

  it('allows git branch --list', () => {
    expect(isExternalGitCommandSafe(['branch', '--list'])).toBe(true)
  })

  it('allows git stash list', () => {
    expect(isExternalGitCommandSafe(['stash', 'list'])).toBe(true)
  })

  it('allows git remote -v', () => {
    expect(isExternalGitCommandSafe(['remote', '-v'])).toBe(true)
  })

  it('allows git ls-remote origin', () => {
    expect(isExternalGitCommandSafe(['ls-remote', 'origin'])).toBe(true)
  })

  it('allows git ls-remote --heads origin', () => {
    expect(isExternalGitCommandSafe(['ls-remote', '--heads', 'origin'])).toBe(true)
  })

  // Known-unsafe: dangerous global flags
  it('rejects git -c core.pager=sh log', () => {
    expect(isExternalGitCommandSafe(['-c', 'core.pager=sh', 'log'])).toBe(false)
  })

  it('rejects git --exec-path', () => {
    expect(isExternalGitCommandSafe(['--exec-path', '/evil'])).toBe(false)
  })

  it('rejects git --config-env KEY=VAR log', () => {
    expect(isExternalGitCommandSafe(['--config-env', 'KEY=VAR', 'log'])).toBe(false)
  })

  it('rejects git --git-dir=/evil log', () => {
    expect(isExternalGitCommandSafe(['--git-dir=/evil', 'log'])).toBe(false)
  })

  it('rejects git --work-tree=/evil log', () => {
    expect(isExternalGitCommandSafe(['--work-tree=/evil', 'log'])).toBe(false)
  })

  it('rejects git --attr-source HEAD log', () => {
    expect(isExternalGitCommandSafe(['--attr-source', 'HEAD', 'log'])).toBe(false)
  })

  // Attached-form short flags
  it('rejects git -ccore.pager=sh log (attached -c)', () => {
    expect(isExternalGitCommandSafe(['-ccore.pager=sh', 'log'])).toBe(false)
  })

  it('rejects git -C/path log (attached -C)', () => {
    expect(isExternalGitCommandSafe(['-C/evil', 'log'])).toBe(false)
  })

  // Variable expansion rejection
  it('rejects args containing $', () => {
    expect(isExternalGitCommandSafe(['diff', '$VAR'])).toBe(false)
  })

  it('rejects $env:SECRET as subcommand', () => {
    expect(isExternalGitCommandSafe(['$env:SECRET'])).toBe(false)
  })

  // ls-remote URL rejection
  it('rejects git ls-remote with https URL', () => {
    expect(isExternalGitCommandSafe(['ls-remote', 'https://github.com/evil/repo'])).toBe(false)
  })

  it('rejects git ls-remote with SSH URL', () => {
    expect(isExternalGitCommandSafe(['ls-remote', 'git@github.com:evil/repo.git'])).toBe(false)
  })

  // Unknown subcommands
  it('rejects unknown subcommand', () => {
    expect(isExternalGitCommandSafe(['push'])).toBe(false)
  })

  it('rejects git commit', () => {
    expect(isExternalGitCommandSafe(['commit', '-m', 'msg'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isExternalGhCommandSafe
// ---------------------------------------------------------------------------

describe('isExternalGhCommandSafe', () => {
  const origEnv = process.env.INTERNAL_BUILD

  beforeEach(() => {
    process.env.INTERNAL_BUILD = '1'
  })

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.INTERNAL_BUILD
    } else {
      process.env.INTERNAL_BUILD = origEnv
    }
  })

  it('returns false when INTERNAL_BUILD is not set', () => {
    delete process.env.INTERNAL_BUILD
    expect(isExternalGhCommandSafe(['pr', 'list'])).toBe(false)
  })

  it('returns false when INTERNAL_BUILD=0', () => {
    process.env.INTERNAL_BUILD = '0'
    expect(isExternalGhCommandSafe(['pr', 'list'])).toBe(false)
  })

  it('returns true for empty args (internal build)', () => {
    expect(isExternalGhCommandSafe([])).toBe(true)
  })

  it('rejects unknown gh subcommand', () => {
    expect(isExternalGhCommandSafe(['repo', 'delete'])).toBe(false)
  })

  it('rejects args containing $', () => {
    expect(isExternalGhCommandSafe(['pr', 'list', '$env:SECRET'])).toBe(false)
  })

  it('rejects $ in flag value', () => {
    expect(isExternalGhCommandSafe(['pr', 'list', '--repo=$SECRET'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isExternalDockerCommandSafe
// ---------------------------------------------------------------------------

describe('isExternalDockerCommandSafe', () => {
  it('returns true for empty args', () => {
    expect(isExternalDockerCommandSafe([])).toBe(true)
  })

  it('allows docker ps', () => {
    expect(isExternalDockerCommandSafe(['ps'])).toBe(true)
  })

  it('allows docker images', () => {
    expect(isExternalDockerCommandSafe(['images'])).toBe(true)
  })

  it('rejects unknown docker subcommand', () => {
    expect(isExternalDockerCommandSafe(['run', 'ubuntu'])).toBe(false)
  })

  it('rejects args containing $', () => {
    expect(isExternalDockerCommandSafe(['ps', '--format=$env:SECRET'])).toBe(false)
  })

  it('rejects $ in subcommand position', () => {
    expect(isExternalDockerCommandSafe(['$env:CMD'])).toBe(false)
  })

  it('rejects docker exec (write operation)', () => {
    expect(isExternalDockerCommandSafe(['exec', 'container', 'bash'])).toBe(false)
  })
})
