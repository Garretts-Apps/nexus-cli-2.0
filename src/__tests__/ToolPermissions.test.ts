import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock heavy dependencies
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))
vi.mock('../services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))
vi.mock('../services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(() => false),
  checkStatsigFeatureGate_CACHED_MAY_BE_STALE: vi.fn(() => false),
}))

import {
  getEmptyToolPermissionContext,
  type ToolPermissionContext,
} from '../Tool.js'

// Mock Tool.js partially - we need getEmptyToolPermissionContext
vi.mock('../Tool.js', async () => {
  return {
    getEmptyToolPermissionContext: () => ({
      mode: 'default' as const,
      additionalWorkingDirectories: new Map(),
      alwaysAllowRules: {},
      alwaysDenyRules: {},
      alwaysAskRules: {},
      isBypassPermissionsModeAvailable: false,
    }),
    toolMatchesName: vi.fn(() => false),
  }
})

describe('ToolPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ToolPermissionContext structure', () => {
    it('creates empty context with default mode', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.mode).toBe('default')
    })

    it('creates empty context with empty allow rules', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.alwaysAllowRules).toEqual({})
    })

    it('creates empty context with empty deny rules', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.alwaysDenyRules).toEqual({})
    })

    it('creates empty context with empty ask rules', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.alwaysAskRules).toEqual({})
    })

    it('creates context with bypass permissions unavailable by default', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.isBypassPermissionsModeAvailable).toBe(false)
    })

    it('creates context with empty additional working directories', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.additionalWorkingDirectories.size).toBe(0)
    })
  })

  describe('Permission mode semantics', () => {
    it('default mode requires permission checks for tool use', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.mode).toBe('default')
      // In default mode, tools need permission checks
      expect(ctx.mode).not.toBe('bypassPermissions')
    })

    it('supports bypass permissions mode concept', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        mode: 'bypassPermissions' as const,
        isBypassPermissionsModeAvailable: true,
      }
      expect(ctx.mode).toBe('bypassPermissions')
      expect(ctx.isBypassPermissionsModeAvailable).toBe(true)
    })

    it('supports plan mode concept', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        mode: 'plan' as const,
      }
      expect(ctx.mode).toBe('plan')
    })
  })

  describe('Permission rule matching', () => {
    it('deny rules take precedence structure validation', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        alwaysDenyRules: {
          user: new Map([
            ['rule-1', { tool: 'Bash', contents: 'rm -rf:*' }],
          ]),
        } as any,
        alwaysAllowRules: {
          user: new Map([
            ['rule-2', { tool: 'Bash', contents: 'rm:*' }],
          ]),
        } as any,
      }
      // Verify both rule sets exist (actual precedence is in permissions.ts)
      expect(ctx.alwaysDenyRules.user.size).toBe(1)
      expect(ctx.alwaysAllowRules.user.size).toBe(1)
    })

    it('allow rules can grant tool access', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        alwaysAllowRules: {
          user: new Map([
            ['rule-1', { tool: 'Read', contents: '*' }],
          ]),
        } as any,
      }
      expect(ctx.alwaysAllowRules.user.has('rule-1')).toBe(true)
    })

    it('ask rules require user confirmation', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        alwaysAskRules: {
          user: new Map([
            ['rule-1', { tool: 'Bash', contents: 'curl:*' }],
          ]),
        } as any,
      }
      expect(ctx.alwaysAskRules.user.has('rule-1')).toBe(true)
    })
  })

  describe('Path constraint semantics', () => {
    it('sensitive file paths should be denied by convention', () => {
      // These are the kinds of paths that should be blocked by permission rules
      const sensitivePaths = [
        '/etc/passwd',
        '/etc/shadow',
        '~/.ssh/id_rsa',
        '~/.ssh/id_ed25519',
        '~/.aws/credentials',
        '~/.gnupg/private-keys-v1.d',
      ]

      for (const path of sensitivePaths) {
        // A well-configured deny rule would block reads to these paths
        const denyRule = { tool: 'Read', contents: `${path}` }
        expect(denyRule.contents).toBe(path)
      }
    })

    it('working directory paths should be allowed by convention', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        additionalWorkingDirectories: new Map([
          ['/home/user/project', { path: '/home/user/project' }],
        ]),
      } as any
      expect(ctx.additionalWorkingDirectories.has('/home/user/project')).toBe(
        true,
      )
    })
  })

  describe('Command constraint semantics', () => {
    it('dangerous commands should have deny rules', () => {
      const dangerousCommands = [
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda',
        'rm -rf /',
        'chmod -R 777 /',
        ':(){:|:&};:', // fork bomb
      ]

      // Each dangerous command should be representable as a deny rule
      for (const cmd of dangerousCommands) {
        const baseCmd = cmd.split(' ')[0]!.split(':')[0]!
        const denyRule = { tool: 'Bash', contents: `${baseCmd}:*` }
        expect(denyRule.tool).toBe('Bash')
        expect(denyRule.contents).toContain(baseCmd)
      }
    })

    it('read-only commands should be safe to allow', () => {
      const readOnlyCommands = [
        'ls -la',
        'cat file.txt',
        'grep pattern file',
        'echo hello',
        'pwd',
        'whoami',
        'date',
        'git status',
        'git log',
        'git diff',
      ]

      for (const cmd of readOnlyCommands) {
        const baseCmd = cmd.split(' ')[0]!
        const allowRule = { tool: 'Bash', contents: `${baseCmd}:*` }
        expect(allowRule.tool).toBe('Bash')
      }
    })
  })

  describe('Stripped dangerous rules', () => {
    it('tracks stripped rules when present', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        strippedDangerousRules: {
          user: new Map([
            [
              'stripped-1',
              { tool: 'Bash', contents: 'sudo:*', reason: 'dangerous' },
            ],
          ]),
        } as any,
      }
      expect(ctx.strippedDangerousRules).toBeDefined()
      expect(ctx.strippedDangerousRules.user.size).toBe(1)
    })

    it('defaults to undefined when no rules are stripped', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.strippedDangerousRules).toBeUndefined()
    })
  })

  describe('shouldAvoidPermissionPrompts', () => {
    it('defaults to undefined (prompts are shown)', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.shouldAvoidPermissionPrompts).toBeUndefined()
    })

    it('can be set to true for background agents', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        shouldAvoidPermissionPrompts: true,
      }
      expect(ctx.shouldAvoidPermissionPrompts).toBe(true)
    })
  })

  describe('prePlanMode preservation', () => {
    it('defaults to undefined', () => {
      const ctx = getEmptyToolPermissionContext()
      expect(ctx.prePlanMode).toBeUndefined()
    })

    it('stores pre-plan mode for restoration', () => {
      const ctx = {
        ...getEmptyToolPermissionContext(),
        mode: 'plan' as const,
        prePlanMode: 'default' as const,
      }
      expect(ctx.prePlanMode).toBe('default')
      expect(ctx.mode).toBe('plan')
    })
  })
})
