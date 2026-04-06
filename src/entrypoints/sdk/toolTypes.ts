// Tool types for the Nexus Agent SDK.
// All types are marked @internal until SDK API stabilizes.
// Placeholder file.

/** @internal */
export type ToolInput = Record<string, unknown>

/** @internal */
export type ToolResult = {
  content: string | Array<{ type: string; text?: string }>
  isError?: boolean
}
