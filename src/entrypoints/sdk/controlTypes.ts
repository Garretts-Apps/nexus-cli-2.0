// Control protocol types for SDK builders (bridge subpath consumers).
// Placeholder file.

import type { SDKMessage } from './coreTypes.js'

export type { SDKMessage }

// Control request sent from SDK consumer to CLI
export type SDKControlRequest = {
  type: string
  requestId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Control response sent from CLI to SDK consumer
export type SDKControlResponse = {
  type: string
  requestId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Permission request sent over bridge
export type SDKControlPermissionRequest = {
  type: 'permission_request'
  requestId: string
  toolName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
}

// Message written to stdout for structured output
export type StdoutMessage = {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
