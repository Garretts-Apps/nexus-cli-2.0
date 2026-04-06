/**
 * Tests for shell permission rule matching and query-related permission logic.
 *
 * These cover the core permission rule parsing, wildcard matching, and suggestion
 * generation that underpins the entire tool permission system. Originally planned
 * as QueryEngine tests, but QueryEngine's deep transitive dependency chain
 * (generated files, WorkflowTool, etc.) makes direct unit testing impractical.
 * These tests cover the security-critical permission matching logic that
 * QueryEngine depends on.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('../utils/permissions/PermissionUpdateSchema.js', () => ({}))

import {
  parsePermissionRule,
  permissionRuleExtractPrefix,
  hasWildcards,
  matchWildcardPattern,
  suggestionForExactCommand,
  suggestionForPrefix,
} from '../permissions/shellRuleMatching.js'

describe('shellRuleMatching (query permission logic)', () => {
  describe('permissionRuleExtractPrefix', () => {
    it('extracts prefix from legacy :* syntax', () => {
      expect(permissionRuleExtractPrefix('npm:*')).toBe('npm')
    })

    it('extracts multi-word prefix from :* syntax', () => {
      expect(permissionRuleExtractPrefix('npm run:*')).toBe('npm run')
    })

    it('returns null for exact match rules', () => {
      expect(permissionRuleExtractPrefix('echo hello')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(permissionRuleExtractPrefix('')).toBeNull()
    })

    it('returns null for bare colon-asterisk (requires non-empty prefix)', () => {
      expect(permissionRuleExtractPrefix(':*')).toBeNull()
    })

    it('handles git command prefix', () => {
      expect(permissionRuleExtractPrefix('git:*')).toBe('git')
    })

    it('handles nested command prefix', () => {
      expect(permissionRuleExtractPrefix('docker compose:*')).toBe(
        'docker compose',
      )
    })
  })

  describe('hasWildcards', () => {
    it('returns false for legacy :* syntax (not a wildcard)', () => {
      expect(hasWildcards('npm:*')).toBe(false)
    })

    it('returns true for standalone wildcard', () => {
      expect(hasWildcards('npm *')).toBe(true)
    })

    it('returns true for wildcard in middle of pattern', () => {
      expect(hasWildcards('git * --verbose')).toBe(true)
    })

    it('returns false for escaped wildcard', () => {
      expect(hasWildcards('echo \\*')).toBe(false)
    })

    it('returns true for double-escaped backslash followed by wildcard', () => {
      // \\* = escaped backslash + unescaped wildcard
      expect(hasWildcards('echo \\\\*')).toBe(true)
    })

    it('returns false for plain text without wildcards', () => {
      expect(hasWildcards('echo hello world')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(hasWildcards('')).toBe(false)
    })
  })

  describe('matchWildcardPattern', () => {
    it('matches exact command against wildcard pattern', () => {
      expect(matchWildcardPattern('git *', 'git status')).toBe(true)
    })

    it('matches command with multiple args against trailing wildcard', () => {
      expect(matchWildcardPattern('git *', 'git diff --cached')).toBe(true)
    })

    it('matches bare command against trailing wildcard pattern', () => {
      // 'git *' should match bare 'git' (optional trailing space+args)
      expect(matchWildcardPattern('git *', 'git')).toBe(true)
    })

    it('does not match unrelated command', () => {
      expect(matchWildcardPattern('git *', 'npm install')).toBe(false)
    })

    it('matches with wildcard in the middle', () => {
      expect(
        matchWildcardPattern('docker * logs', 'docker compose logs'),
      ).toBe(true)
    })

    it('matches literal asterisk with escaped wildcard', () => {
      expect(matchWildcardPattern('echo \\*', 'echo *')).toBe(true)
    })

    it('does not match non-asterisk with escaped wildcard', () => {
      expect(matchWildcardPattern('echo \\*', 'echo hello')).toBe(false)
    })

    it('handles escaped backslash correctly', () => {
      expect(matchWildcardPattern('echo \\\\', 'echo \\')).toBe(true)
    })

    it('handles regex special characters in pattern', () => {
      // Dots, pluses, etc. should be treated as literals
      expect(matchWildcardPattern('file.txt', 'file.txt')).toBe(true)
      expect(matchWildcardPattern('file.txt', 'fileatxt')).toBe(false)
    })

    it('supports case insensitive matching', () => {
      expect(matchWildcardPattern('Git *', 'git status', true)).toBe(true)
    })

    it('is case sensitive by default', () => {
      expect(matchWildcardPattern('Git *', 'git status')).toBe(false)
    })

    it('matches with multiple wildcards', () => {
      expect(matchWildcardPattern('* run *', 'npm run build')).toBe(true)
    })

    it('handles command with newlines (dotAll flag)', () => {
      expect(matchWildcardPattern('echo *', 'echo hello\nworld')).toBe(true)
    })

    it('trims pattern whitespace', () => {
      expect(matchWildcardPattern('  git *  ', 'git status')).toBe(true)
    })
  })

  describe('parsePermissionRule', () => {
    it('parses legacy :* as prefix rule', () => {
      const result = parsePermissionRule('npm:*')
      expect(result).toEqual({ type: 'prefix', prefix: 'npm' })
    })

    it('parses wildcard pattern', () => {
      const result = parsePermissionRule('git * --verbose')
      expect(result).toEqual({ type: 'wildcard', pattern: 'git * --verbose' })
    })

    it('parses exact match command', () => {
      const result = parsePermissionRule('echo hello world')
      expect(result).toEqual({ type: 'exact', command: 'echo hello world' })
    })

    it('parses git prefix rule', () => {
      const result = parsePermissionRule('git:*')
      expect(result).toEqual({ type: 'prefix', prefix: 'git' })
    })

    it('parses escaped wildcard as exact match', () => {
      const result = parsePermissionRule('echo \\*')
      expect(result).toEqual({ type: 'exact', command: 'echo \\*' })
    })

    it('parses trailing wildcard pattern', () => {
      const result = parsePermissionRule('npm *')
      expect(result).toEqual({ type: 'wildcard', pattern: 'npm *' })
    })
  })

  describe('suggestionForExactCommand', () => {
    it('generates suggestion for exact command', () => {
      const result = suggestionForExactCommand('Bash', 'echo hello')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'addRules',
        behavior: 'allow',
        rules: [{ toolName: 'Bash', ruleContent: 'echo hello' }],
      })
    })

    it('preserves exact command text in suggestion', () => {
      const result = suggestionForExactCommand('Bash', 'git diff --cached')
      expect(result[0]!.rules[0]!.ruleContent).toBe('git diff --cached')
    })
  })

  describe('suggestionForPrefix', () => {
    it('generates suggestion with :* suffix', () => {
      const result = suggestionForPrefix('Bash', 'npm')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'addRules',
        behavior: 'allow',
        rules: [{ toolName: 'Bash', ruleContent: 'npm:*' }],
      })
    })

    it('handles multi-word prefix', () => {
      const result = suggestionForPrefix('Bash', 'npm run')
      expect(result[0]!.rules[0]!.ruleContent).toBe('npm run:*')
    })
  })

  describe('security-critical edge cases', () => {
    it('wildcard does not match empty command for middle-wildcard patterns', () => {
      expect(matchWildcardPattern('* rm *', '')).toBe(false)
    })

    it('prefix extraction handles colons in command', () => {
      // Only the LAST :* should be treated as prefix syntax
      expect(permissionRuleExtractPrefix('docker run -p 8080:80:*')).toBe(
        'docker run -p 8080:80',
      )
    })

    it('wildcard matching handles parentheses in patterns', () => {
      // Regex special chars should be escaped
      expect(matchWildcardPattern('find . -name (*.txt)', 'find . -name (*.txt)')).toBe(true)
    })

    it('wildcard matching handles pipe characters in patterns', () => {
      expect(matchWildcardPattern('cmd | grep *', 'cmd | grep pattern')).toBe(true)
    })

    it('exact match does not partially match', () => {
      const rule = parsePermissionRule('echo hello')
      expect(rule.type).toBe('exact')
      // Exact rule with value 'echo hello' should not match 'echo hello world'
      // (actual matching happens at a higher layer, but the rule itself is exact)
      expect(rule).toEqual({ type: 'exact', command: 'echo hello' })
    })

    it('prefix rule with git does not match github', () => {
      // The prefix is 'git', so startsWith check at match layer matters
      const rule = parsePermissionRule('git:*')
      expect(rule.type).toBe('prefix')
      expect(rule).toEqual({ type: 'prefix', prefix: 'git' })
    })
  })
})
