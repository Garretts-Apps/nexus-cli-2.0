import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock heavy dependencies before importing the module under test
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))
vi.mock('../../../services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))
vi.mock('../../../services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(() => false),
  checkStatsigFeatureGate_CACHED_MAY_BE_STALE: vi.fn(() => false),
}))
vi.mock('../../../utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test/project'),
}))
vi.mock('../../../utils/platform.js', () => ({
  getPlatform: vi.fn(() => 'darwin'),
}))
vi.mock('../../../utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))
vi.mock('../../../utils/envUtils.js', () => ({
  isEnvTruthy: vi.fn(() => false),
}))
vi.mock('../../../utils/errors.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/errors.js')>()
  return { ...actual }
})
vi.mock('../../../utils/sandbox/sandbox-adapter.js', () => ({
  SandboxManager: {
    isSandboxingEnabled: vi.fn(() => false),
  },
}))
vi.mock('../../../utils/slowOperations.js', () => ({
  jsonStringify: vi.fn(JSON.stringify),
}))
vi.mock('../../../utils/windowsPaths.js', () => ({
  windowsPathToPosixPath: vi.fn((p: string) => p),
}))
vi.mock('../../../utils/permissions/bashClassifier.js', () => ({
  classifyBashCommand: vi.fn(),
  getBashPromptAllowDescriptions: vi.fn(() => []),
  getBashPromptAskDescriptions: vi.fn(() => []),
  getBashPromptDenyDescriptions: vi.fn(() => []),
  isClassifierPermissionsEnabled: vi.fn(() => false),
}))
vi.mock('../../../utils/permissions/PermissionResult.js', () => ({}))
vi.mock('../../../utils/permissions/PermissionRule.js', () => ({}))
vi.mock('../../../utils/permissions/PermissionUpdate.js', () => ({
  extractRules: vi.fn(() => new Map()),
}))
vi.mock('../../../utils/permissions/PermissionUpdateSchema.js', () => ({}))
vi.mock('../../../utils/permissions/permissionRuleParser.js', () => ({
  permissionRuleValueToString: vi.fn(),
}))
vi.mock('../../../utils/permissions/permissions.js', () => ({
  createPermissionRequestMessage: vi.fn(() => ''),
  getRuleByContentsForTool: vi.fn(),
}))
vi.mock('../../../utils/permissions/shellRuleMatching.js', () => ({
  parsePermissionRule: vi.fn(),
  matchWildcardPattern: vi.fn(() => false),
  permissionRuleExtractPrefix: vi.fn(() => ''),
  suggestionForExactCommand: vi.fn(() => ''),
  suggestionForPrefix: vi.fn(() => ''),
}))
vi.mock('@anthropic-ai/sdk', () => ({
  APIUserAbortError: class APIUserAbortError extends Error {},
}))
vi.mock('../bashCommandHelpers.js', () => ({
  checkCommandOperatorPermissions: vi.fn(() => ({
    behavior: 'passthrough',
    message: '',
  })),
}))
vi.mock('../bashSecurity.js', () => ({
  bashCommandIsSafeAsync_DEPRECATED: vi.fn(() =>
    Promise.resolve({ behavior: 'passthrough', message: '' }),
  ),
  checkBypassPermissionsRateLimit: vi.fn(() => ({
    behavior: 'passthrough',
    message: 'Within per-turn bypass limit',
  })),
  stripSafeHeredocSubstitutions: vi.fn(() => null),
}))
vi.mock('../modeValidation.js', () => ({
  checkPermissionMode: vi.fn(() => null),
}))
vi.mock('../pathValidation.js', () => ({
  checkPathConstraints: vi.fn(() => null),
}))
vi.mock('../sedValidation.js', () => ({
  checkSedConstraints: vi.fn(() => null),
}))
vi.mock('../shouldUseSandbox.js', () => ({
  shouldUseSandbox: vi.fn(() => false),
}))
vi.mock('../../../bash/ast.js', () => ({
  checkSemantics: vi.fn(() => ({ ok: true })),
  nodeTypeId: vi.fn(() => 0),
  parseForSecurityFromAst: vi.fn(() => ({ kind: 'parse-unavailable' })),
}))
vi.mock('../../../bash/commands.js', () => ({
  extractOutputRedirections: vi.fn((cmd: string) => ({
    commandWithoutRedirections: cmd,
    redirections: [],
  })),
  getCommandSubcommandPrefix: vi.fn(() => ({ prefix: '', subcommand: '' })),
  splitCommand_DEPRECATED: vi.fn((cmd: string) => [cmd]),
}))
vi.mock('../../../bash/parser.js', () => ({
  parseCommandRaw: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../../../bash/shellQuote.js', () => ({
  tryParseShellCommand: vi.fn(() => ({ success: true, tokens: [] })),
}))
vi.mock('../../../utils/config.js', () => ({
  getGlobalConfig: vi.fn(() => ({})),
}))
vi.mock('../BashTool.js', () => ({
  BashTool: {
    name: 'Bash',
    inputSchema: {},
  },
}))

import {
  stripSafeWrappers,
  stripAllLeadingEnvVars,
  stripWrappersFromArgv,
  isNormalizedGitCommand,
  isNormalizedCdCommand,
  commandHasAnyCd,
  getSimpleCommandPrefix,
  getFirstWordPrefix,
  BINARY_HIJACK_VARS,
} from '../bashPermissions.js'

describe('bashPermissions', () => {
  describe('stripSafeWrappers', () => {
    it('strips nohup wrapper from command', () => {
      const result = stripSafeWrappers('nohup command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips timeout with numeric duration from command', () => {
      const result = stripSafeWrappers('timeout 30 command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips time wrapper from command', () => {
      const result = stripSafeWrappers('time command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips nice wrapper from command', () => {
      const result = stripSafeWrappers('nice command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips nice with priority from command', () => {
      const result = stripSafeWrappers('nice -n 10 command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips stdbuf wrapper from command', () => {
      const result = stripSafeWrappers('stdbuf -o0 command arg1')
      expect(result).toBe('command arg1')
    })

    it('strips LANG env var from command', () => {
      const result = stripSafeWrappers('LANG=C sort file')
      expect(result).toBe('sort file')
    })

    it('strips multiple safe env vars from command', () => {
      const result = stripSafeWrappers('LANG=C TZ=UTC sort file')
      expect(result).toBe('sort file')
    })

    it('strips nohup followed by timeout (multiple wrappers)', () => {
      const result = stripSafeWrappers('nohup timeout 30 command')
      expect(result).toBe('command')
    })

    it('strips timeout with seconds unit suffix', () => {
      const result = stripSafeWrappers('timeout 30s command')
      expect(result).toBe('command')
    })

    it('strips timeout with minutes unit suffix', () => {
      const result = stripSafeWrappers('timeout 5m command')
      expect(result).toBe('command')
    })

    it('strips timeout with --kill-after flag', () => {
      const result = stripSafeWrappers('timeout --kill-after=5 30 command')
      expect(result).toBe('command')
    })

    it('strips timeout with --signal flag', () => {
      const result = stripSafeWrappers('timeout --signal=TERM 30 command')
      expect(result).toBe('command')
    })

    it('strips nohup with -- end-of-options marker', () => {
      const result = stripSafeWrappers('nohup -- command')
      expect(result).toBe('command')
    })

    it('does not strip unsafe env vars like PATH', () => {
      // PATH is not in SAFE_ENV_VARS, so it should remain
      const result = stripSafeWrappers('PATH=/evil sort file')
      expect(result).toBe('PATH=/evil sort file')
    })

    it('does not strip LD_PRELOAD env var', () => {
      const result = stripSafeWrappers('LD_PRELOAD=/evil.so command')
      expect(result).toBe('LD_PRELOAD=/evil.so command')
    })

    it('returns the command unchanged when no wrappers match', () => {
      const result = stripSafeWrappers('echo hello world')
      expect(result).toBe('echo hello world')
    })

    it('handles empty command input', () => {
      const result = stripSafeWrappers('')
      expect(result).toBe('')
    })

    it('handles command with only whitespace', () => {
      const result = stripSafeWrappers('   ')
      expect(result).toBe('')
    })

    it('strips NODE_ENV env var from command', () => {
      const result = stripSafeWrappers('NODE_ENV=production npm start')
      expect(result).toBe('npm start')
    })

    it('strips RUST_LOG env var from command', () => {
      const result = stripSafeWrappers('RUST_LOG=debug cargo test')
      expect(result).toBe('cargo test')
    })
  })

  describe('stripAllLeadingEnvVars', () => {
    it('strips a single env var assignment', () => {
      const result = stripAllLeadingEnvVars('VAR=val cmd')
      expect(result).toBe('cmd')
    })

    it('strips multiple env var assignments', () => {
      const result = stripAllLeadingEnvVars('A=x B=y C=z cmd --arg')
      expect(result).toBe('cmd --arg')
    })

    it('strips env vars with complex unquoted values', () => {
      const result = stripAllLeadingEnvVars('FOO=bar/baz:qux cmd')
      expect(result).toBe('cmd')
    })

    it('strips env vars with single-quoted values', () => {
      const result = stripAllLeadingEnvVars("FOO='bar baz' cmd")
      expect(result).toBe('cmd')
    })

    it('strips env vars with double-quoted values', () => {
      const result = stripAllLeadingEnvVars('FOO="bar baz" cmd')
      expect(result).toBe('cmd')
    })

    it('does not strip when blocklist matches the var name', () => {
      const blocklist = /^LD_/
      const result = stripAllLeadingEnvVars('LD_PRELOAD=/evil.so cmd', blocklist)
      expect(result).toBe('LD_PRELOAD=/evil.so cmd')
    })

    it('strips non-blocklisted vars but stops at blocklisted var', () => {
      const blocklist = /^LD_/
      const result = stripAllLeadingEnvVars(
        'FOO=bar LD_PRELOAD=/evil.so cmd',
        blocklist,
      )
      expect(result).toBe('LD_PRELOAD=/evil.so cmd')
    })

    it('handles command with no leading env vars', () => {
      const result = stripAllLeadingEnvVars('cmd --arg')
      expect(result).toBe('cmd --arg')
    })

    it('handles env var with += append syntax', () => {
      const result = stripAllLeadingEnvVars('FOO+=bar cmd')
      expect(result).toBe('cmd')
    })

    it('handles env var with array index syntax', () => {
      const result = stripAllLeadingEnvVars('FOO[0]=bar cmd')
      expect(result).toBe('cmd')
    })

    it('does not strip vars with dangerous $ in value (expansion risk)', () => {
      // $VAR in unquoted values is not stripped to block dangerous forms
      const result = stripAllLeadingEnvVars('FOO=$BAR cmd')
      expect(result).toBe('FOO=$BAR cmd')
    })
  })

  describe('stripWrappersFromArgv', () => {
    it('strips nohup from argv', () => {
      const result = stripWrappersFromArgv(['nohup', 'command', 'arg1'])
      expect(result).toEqual(['command', 'arg1'])
    })

    it('strips timeout with duration from argv', () => {
      const result = stripWrappersFromArgv(['timeout', '30', 'command', 'arg1'])
      expect(result).toEqual(['command', 'arg1'])
    })

    it('strips time from argv', () => {
      const result = stripWrappersFromArgv(['time', 'command', 'arg1'])
      expect(result).toEqual(['command', 'arg1'])
    })

    it('does not strip bare nice without -n flag from argv', () => {
      // stripWrappersFromArgv only strips nice when followed by -n <priority>
      const result = stripWrappersFromArgv(['nice', 'command', 'arg1'])
      expect(result).toEqual(['nice', 'command', 'arg1'])
    })

    it('strips nice with -n flag from argv', () => {
      const result = stripWrappersFromArgv([
        'nice',
        '-n',
        '10',
        'command',
        'arg1',
      ])
      expect(result).toEqual(['command', 'arg1'])
    })

    it('strips nohup with -- from argv', () => {
      const result = stripWrappersFromArgv(['nohup', '--', 'command', 'arg1'])
      expect(result).toEqual(['command', 'arg1'])
    })

    it('returns argv unchanged when no wrappers match', () => {
      const result = stripWrappersFromArgv(['echo', 'hello'])
      expect(result).toEqual(['echo', 'hello'])
    })

    it('handles empty argv', () => {
      const result = stripWrappersFromArgv([])
      expect(result).toEqual([])
    })

    it('strips nested wrappers: nohup timeout 30 command', () => {
      const result = stripWrappersFromArgv([
        'nohup',
        'timeout',
        '30',
        'command',
      ])
      expect(result).toEqual(['command'])
    })

    it('strips timeout with --foreground flag', () => {
      const result = stripWrappersFromArgv([
        'timeout',
        '--foreground',
        '30',
        'command',
      ])
      expect(result).toEqual(['command'])
    })

    it('strips timeout with --kill-after space-separated value', () => {
      const result = stripWrappersFromArgv([
        'timeout',
        '--kill-after',
        '5',
        '30',
        'command',
      ])
      expect(result).toEqual(['command'])
    })
  })

  describe('BINARY_HIJACK_VARS', () => {
    it('matches LD_PRELOAD', () => {
      expect(BINARY_HIJACK_VARS.test('LD_PRELOAD')).toBe(true)
    })

    it('matches LD_LIBRARY_PATH', () => {
      expect(BINARY_HIJACK_VARS.test('LD_LIBRARY_PATH')).toBe(true)
    })

    it('matches DYLD_INSERT_LIBRARIES', () => {
      expect(BINARY_HIJACK_VARS.test('DYLD_INSERT_LIBRARIES')).toBe(true)
    })

    it('matches PATH exactly', () => {
      expect(BINARY_HIJACK_VARS.test('PATH')).toBe(true)
    })

    it('does not match LANG', () => {
      expect(BINARY_HIJACK_VARS.test('LANG')).toBe(false)
    })

    it('does not match HOME', () => {
      expect(BINARY_HIJACK_VARS.test('HOME')).toBe(false)
    })
  })

  describe('isNormalizedGitCommand', () => {
    it('returns true for bare git command', () => {
      expect(isNormalizedGitCommand('git status')).toBe(true)
    })

    it('returns true for git with subcommand', () => {
      expect(isNormalizedGitCommand('git diff --cached')).toBe(true)
    })

    it('returns false for non-git command', () => {
      expect(isNormalizedGitCommand('echo hello')).toBe(false)
    })

    it('returns false for github-like commands that start with git prefix', () => {
      expect(isNormalizedGitCommand('github-cli status')).toBe(false)
    })
  })

  describe('isNormalizedCdCommand', () => {
    it('returns true for cd command', () => {
      expect(isNormalizedCdCommand('cd /tmp')).toBe(true)
    })

    it('returns true for bare cd', () => {
      expect(isNormalizedCdCommand('cd')).toBe(true)
    })

    it('returns false for non-cd command', () => {
      expect(isNormalizedCdCommand('ls /tmp')).toBe(false)
    })
  })

  describe('commandHasAnyCd', () => {
    it('returns true when command contains cd', () => {
      expect(commandHasAnyCd('cd /tmp && ls')).toBe(true)
    })

    it('returns false when command has no cd', () => {
      expect(commandHasAnyCd('echo hello && ls')).toBe(false)
    })
  })

  describe('getSimpleCommandPrefix', () => {
    it('returns two-word prefix for command with subcommand', () => {
      // getSimpleCommandPrefix returns first two tokens joined when second looks like a subcommand
      const result = getSimpleCommandPrefix('git status')
      expect(result).toBe('git status')
    })

    it('returns two-word prefix for npm run', () => {
      const result = getSimpleCommandPrefix('npm run build')
      expect(result).toBe('npm run')
    })

    it('returns null for empty command', () => {
      const result = getSimpleCommandPrefix('')
      expect(result).toBeNull()
    })

    it('returns null for single-word command (no subcommand)', () => {
      // Requires at least 2 remaining tokens
      const result = getSimpleCommandPrefix('echo')
      expect(result).toBeNull()
    })

    it('returns null when second token is a flag (not a subcommand)', () => {
      // -la does not match subcommand pattern
      const result = getSimpleCommandPrefix('ls -la')
      expect(result).toBeNull()
    })

    it('skips safe env var assignments to find the command prefix', () => {
      const result = getSimpleCommandPrefix('LANG=C git status')
      expect(result).toBe('git status')
    })

    it('returns null when command starts with unsafe env var', () => {
      const result = getSimpleCommandPrefix('PATH=/evil sort file')
      expect(result).toBeNull()
    })
  })

  describe('getFirstWordPrefix', () => {
    it('returns first word of simple command', () => {
      const result = getFirstWordPrefix('echo hello')
      expect(result).toBe('echo')
    })

    it('returns null for empty command', () => {
      const result = getFirstWordPrefix('')
      expect(result).toBeNull()
    })

    it('skips safe env vars to get first command word', () => {
      const result = getFirstWordPrefix('LANG=C sort file')
      expect(result).toBe('sort')
    })
  })
})
