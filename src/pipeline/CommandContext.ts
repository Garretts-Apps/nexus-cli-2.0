import type { AppState } from '../state/AppStateStore.js'
import type { ToolUseContext } from '../Tool.js'
import type { Message } from '../types/message.js'

export type CommandCompletionCallback = (
  result?: string,
  options?: { display?: 'skip' | 'system' | 'user'; shouldQuery?: boolean },
) => void

export interface ExecutionContext {
  readonly input: string
  readonly commandName: string
  readonly appState: AppState
  readonly toolUseContext?: ToolUseContext
  readonly abortSignal: AbortSignal
  readonly setMessages: (
    updater: (prev: Message[]) => Message[],
  ) => void
  readonly onDone: CommandCompletionCallback
}
