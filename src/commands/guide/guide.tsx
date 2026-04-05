import React from 'react'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  getContextGuide,
  rollProfile,
  contextGuideUserId,
} from '../../context_guide/execution_profile.js'
import { getProfileGuidanceTip } from '../../context_guide/guidance_prompts.js'
import { METRIC_LABELS, PROFILE_COLORS } from '../../context_guide/types.js'

export const call: LocalJSXCommandCall = async onDone => {
  const guide = getContextGuide()
  const { core } = rollProfile(contextGuideUserId())
  const color = PROFILE_COLORS[core.profile] ?? 'inactive'
  const tip = getProfileGuidanceTip(core.profile, core.philosophySeed)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color={color}>
        ContextGuide — {core.profile}
      </Text>
      <Text dimColor>{'─'.repeat(40)}</Text>
      {guide ? (
        <>
          <Text>
            <Text dimColor>Philosophy: </Text>
            <Text>{guide.executionPhilosophy}</Text>
          </Text>
          <Text>
            <Text dimColor>Activated: </Text>
            <Text>{new Date(guide.activatedAt).toLocaleDateString()}</Text>
          </Text>
        </>
      ) : (
        <Text dimColor>Run /guide to activate execution tracking.</Text>
      )}
      <Text dimColor>{'─'.repeat(40)}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Execution Metrics</Text>
        {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map(k => (
          <Text key={k}>
            <Text dimColor>{METRIC_LABELS[k]}: </Text>
            <Text color={color}>{Math.round(core.metrics[k])}</Text>
          </Text>
        ))}
      </Box>
      <Text dimColor>{'─'.repeat(40)}</Text>
      <Text>
        <Text dimColor>Tip: </Text>
        <Text italic>{tip}</Text>
      </Text>
      <Text dimColor marginTop={1}>
        Press any key to close
      </Text>
    </Box>
  )
}
