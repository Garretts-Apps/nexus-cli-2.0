import React, { useEffect } from 'react'
import { useNotifications } from '../context/notifications.js'
import { Text } from '../ink.js'
import { getGlobalConfig } from '../utils/config.js'
import { getContextGuide } from './execution_profile.js'
import { getProfileGuidanceTip } from './guidance_prompts.js'

// Returns true when ContextGuide has been activated for the current user.
export function isContextGuideActive(): boolean {
  const config = getGlobalConfig()
  return !!(config.contextGuide as { activatedAt?: number } | undefined)?.activatedAt
}

// Returns trigger positions for /guide in the given input string.
// Used by PromptInput to highlight the command with profile color.
export function findGuideTriggerPositions(
  text: string,
): Array<{ start: number; end: number }> {
  const triggers: Array<{ start: number; end: number }> = []
  const re = /\/guide\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    triggers.push({ start: m.index, end: m.index + m[0].length })
  }
  return triggers
}

// Startup hint shown when ContextGuide is not yet activated.
function GuideHint(): React.ReactNode {
  return <Text color="cyan">/guide</Text>
}

// Hook: on mount, show a startup notification prompting the user to run /guide
// if they haven't activated ContextGuide yet.
export function useContextGuidance(): void {
  const { addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    if (isContextGuideActive()) return
    addNotification({
      key: 'context-guide-hint',
      jsx: <GuideHint />,
      priority: 'immediate',
      timeoutMs: 15_000,
    })
    return () => removeNotification('context-guide-hint')
  }, [addNotification, removeNotification])
}

// Hook: returns the current execution tip for the active guide profile.
// Returns undefined if no guide is active.
export function useExecutionTip(): string | undefined {
  const guide = getContextGuide()
  if (!guide) return undefined
  return getProfileGuidanceTip(guide.profile, guide.philosophySeed)
}
