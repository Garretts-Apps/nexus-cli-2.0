import type { ExecutionProfile } from './types.js'
import type { Message } from '../types/message.js'
import type { Attachment } from '../utils/attachments.js'
import { getGlobalConfig } from '../utils/config.js'
import { getContextGuide } from './execution_profile.js'

// Per-profile deterministic tips. Tip index derived from philosophySeed so
// each user gets a consistent tip that evolves as their seed changes.
const PROFILE_TIPS: Record<ExecutionProfile, string[]> = {
  Methodical: [
    'Break tasks into atomic steps before executing.',
    'Validate assumptions at each checkpoint.',
    'Prefer explicit over implicit in every change.',
    'Document intent before implementation.',
    'Run diagnostics after each file change.',
  ],
  Creative: [
    'Consider unconventional approaches first.',
    'Prototype rapidly, refine iteratively.',
    'Cross-domain patterns often yield the best solutions.',
    'Question the problem framing before solving.',
    'Small experiments reduce large-scale risk.',
  ],
  Aggressive: [
    'Ship the minimal viable change, iterate fast.',
    'Cut scope ruthlessly — done beats perfect.',
    'Parallelize independent work whenever possible.',
    'Eliminate blockers immediately, document later.',
    'Move fast with small, reversible commits.',
  ],
  Balanced: [
    'Match solution complexity to problem complexity.',
    'Verify before claiming completion.',
    'Balance speed and correctness based on risk.',
    'Use the lightest tool that gets the job done.',
    'Steady cadence beats burst-and-crash cycles.',
  ],
  Analytical: [
    'Measure before optimizing.',
    'Trace root causes, not symptoms.',
    'Data shapes architecture — read it first.',
    'Statistical confidence matters in ambiguous spaces.',
    'Model the system before modifying it.',
  ],
}

// Returns a deterministic tip for the given profile and seed.
export function getProfileGuidanceTip(
  profile: ExecutionProfile,
  seed: number,
): string {
  const tips = PROFILE_TIPS[profile]
  return tips[seed % tips.length]!
}

// Intro text injected into the context window when ContextGuide is active.
export function contextGuideIntroText(profile: string, philosophy: string): string {
  return `# ContextGuide

The user is running with ContextGuide active. Their execution profile is **${profile}**.

Execution philosophy: ${philosophy}

Adapt task guidance and suggestions to match this execution profile. Keep guidance concise and task-focused. Do not narrate the guide — it operates silently in the background.`
}

// Returns the intro attachment if ContextGuide is active and not yet announced.
export function getContextGuideIntroAttachment(
  messages: Message[] | undefined,
): Attachment[] {
  const guide = getContextGuide()
  if (!guide || (getGlobalConfig().contextGuideMuted as boolean | undefined)) return []

  // Skip if already announced for this session.
  for (const msg of messages ?? []) {
    if (msg.type !== 'attachment') continue
    if (msg.attachment.type !== 'context_guide_intro') continue
    return []
  }

  return [
    {
      type: 'context_guide_intro',
      profile: guide.profile,
      philosophy: guide.executionPhilosophy,
    },
  ]
}
