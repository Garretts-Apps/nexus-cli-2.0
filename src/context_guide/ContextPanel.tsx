import React, { useEffect, useRef, useState } from 'react'
import { useTerminalSize } from '../hooks/useTerminalSize.js'
import { Box, Text } from '../ink.js'
import { useAppState } from '../state/AppState.js'
import { isFullscreenActive } from '../utils/fullscreen.js'
import { getContextGuide } from './execution_profile.js'
import { METRIC_LABELS, PROFILE_COLORS } from './types.js'

// Minimum terminal columns required to render the full side panel.
// Below this, the panel collapses to a single inline indicator.
export const MIN_COLS_FOR_CONTEXT_PANEL = 100

// How many columns the panel reserves when visible.
const PANEL_WIDTH = 18

// Returns the number of columns the ContextPanel occupies at the given terminal width.
// PromptInput uses this to know how much space to leave on the right.
export function contextPanelReservedColumns(
  terminalColumns: number,
  active: boolean,
): number {
  if (!active) return 0
  if (terminalColumns < MIN_COLS_FOR_CONTEXT_PANEL) return 0
  return PANEL_WIDTH
}

const TICK_MS = 1000

// Compact one-liner shown in narrow terminals.
function NarrowIndicator({ profile }: { profile: string }): React.ReactNode {
  const color = PROFILE_COLORS[profile as keyof typeof PROFILE_COLORS] ?? 'inactive'
  return (
    <Box>
      <Text color={color}>[{profile}]</Text>
    </Box>
  )
}

// Main panel rendered alongside the prompt in wide terminals.
export function ContextPanel(): React.ReactNode {
  const guide = getContextGuide()
  const { columns } = useTerminalSize()
  const [tick, setTick] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pulse tick for a live "uptime" feel.
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [])

  if (!guide) return null

  const color = PROFILE_COLORS[guide.profile] ?? 'inactive'

  if (columns < MIN_COLS_FOR_CONTEXT_PANEL) {
    return <NarrowIndicator profile={guide.profile} />
  }

  const successPct = Math.round(guide.metrics.SUCCESS_RATE)
  const depth = Math.round(guide.metrics.INSIGHT_DEPTH)
  const completed = guide.metrics.TASKS_COMPLETED

  // Simple bar: filled blocks proportional to 0-100 score, width=8
  function bar(value: number): string {
    const filled = Math.round((value / 100) * 8)
    return '█'.repeat(filled) + '░'.repeat(8 - filled)
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      width={PANEL_WIDTH}
    >
      <Text color={color} bold>
        {guide.profile}
      </Text>
      <Text dimColor>────────────</Text>
      <Text>
        <Text dimColor>{METRIC_LABELS.SUCCESS_RATE.slice(0, 7)}: </Text>
        <Text color={color}>{bar(successPct)}</Text>
      </Text>
      <Text>
        <Text dimColor>Depth: </Text>
        <Text color={color}>{bar(depth)}</Text>
      </Text>
      <Text>
        <Text dimColor>Tasks: </Text>
        <Text>{String(Math.round(completed))}</Text>
      </Text>
      <Text dimColor>────────────</Text>
      <Text dimColor italic>
        /guide
      </Text>
    </Box>
  )
}

// Floating bubble variant used in fullscreen layout — shows current execution hint.
export function ContextFloatingHint(): React.ReactNode {
  const guide = getContextGuide()
  const contextHint = useAppState(s => (s as any).contextGuideHint as string | undefined)

  if (!guide || !contextHint || !isFullscreenActive()) return null

  const color = PROFILE_COLORS[guide.profile] ?? 'inactive'
  return (
    <Box borderStyle="round" borderColor={color} paddingX={1}>
      <Text italic color={color}>
        {contextHint}
      </Text>
    </Box>
  )
}
