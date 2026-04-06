// Runtime types for the Nexus Agent SDK.
// These types include callbacks, interfaces with methods, and other non-serializable types
// that cannot be expressed as Zod schemas.
//
// This is a placeholder file. The full implementation lives in the SDK package.

import type { z } from 'zod'
import type { SDKMessage, SDKSessionInfo, SDKUserMessage } from './coreTypes.js'

// Re-export SDKMessage for convenience
export type { SDKMessage, SDKSessionInfo, SDKUserMessage }

// Effort level for controlling model reasoning depth
export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// Zod schema shape helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodRawShape = { [k: string]: z.ZodTypeAny }
export type InferShape<T extends AnyZodRawShape> = z.infer<z.ZodObject<T>>

// MCP tool definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = any> = {
  name: string
  description: string
  inputSchema: Schema
}

// MCP server config with instance
export type McpSdkServerConfigWithInstance = {
  type: 'sdk-mcp'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any
}

// Query types
export type Query = AsyncIterable<SDKMessage>
export type InternalQuery = AsyncIterable<SDKMessage>

// Session message for transcript reading
export type SessionMessage = {
  role: 'user' | 'assistant'
  content: string
  uuid: string
  parentUuid?: string
  timestamp?: number
}

// Options for query()
export type Options = {
  model?: string
  maxTurns?: number
  systemPrompt?: string
  cwd?: string
  allowedTools?: string[]
  signal?: AbortSignal
}

export type InternalOptions = Options & {
  _internal?: boolean
}

// Session options
export type SDKSessionOptions = {
  model?: string
  cwd?: string
  systemPrompt?: string
  maxTurns?: number
  allowedTools?: string[]
}

// Session handle (v2 API)
export type SDKSession = {
  id: string
  send(message: string | SDKUserMessage): Query
  abort(): void
}

// Session management option types
export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = {
  dir?: string
}

export type ForkSessionOptions = {
  dir?: string
  upToMessageId?: string
  title?: string
}

export type ForkSessionResult = {
  sessionId: string
}
