// Hook registry state: registered SDK callbacks and plugin native hooks,
// plus SDK init event JSON schema.
// Extracted from src/bootstrap/state.ts (ARCH-002 Phase 4b, Step 2).

import { HOOK_EVENTS } from 'src/entrypoints/agentSdkTypes.js'
import type { HookCallbackMatcher } from 'src/types/hooks.js'
import type { PluginHookMatcher } from 'src/settings/types.js'

type HookEvent = (typeof HOOK_EVENTS)[number]

// Union type for registered hooks - can be SDK callbacks or native plugin hooks
type RegisteredHookMatcher = HookCallbackMatcher | PluginHookMatcher

// ── State ──

let registeredHooks: Partial<Record<HookEvent, RegisteredHookMatcher[]>> | null =
  null
let initJsonSchema: Record<string, unknown> | null = null

// ── Hook registry accessors ──

export function registerHookCallbacks(
  hooks: Partial<Record<HookEvent, RegisteredHookMatcher[]>>,
): void {
  if (!registeredHooks) {
    registeredHooks = {}
  }

  // `registerHookCallbacks` may be called multiple times, so we need to merge (not overwrite)
  for (const [event, matchers] of Object.entries(hooks)) {
    const eventKey = event as HookEvent
    const existing = registeredHooks[eventKey]
    if (!existing) {
      registeredHooks[eventKey] = [...(matchers ?? [])]
    } else {
      for (const m of matchers ?? []) {
        existing.push(m)
      }
    }
  }
}

export function getRegisteredHooks(): Partial<
  Record<HookEvent, RegisteredHookMatcher[]>
> | null {
  return registeredHooks
}

export function clearRegisteredHooks(): void {
  registeredHooks = null
}

export function clearRegisteredPluginHooks(): void {
  if (!registeredHooks) {
    return
  }

  const filtered: Partial<Record<HookEvent, RegisteredHookMatcher[]>> = {}
  for (const [event, matchers] of Object.entries(registeredHooks)) {
    if (!matchers) continue
    // Keep only callback hooks (those without pluginRoot)
    const callbackHooks = matchers.filter(m => !('pluginRoot' in m))
    if (callbackHooks.length > 0) {
      filtered[event as HookEvent] = callbackHooks
    }
  }

  registeredHooks = Object.keys(filtered).length > 0 ? filtered : null
}

// ── SDK init schema accessors ──

export function setInitJsonSchema(schema: Record<string, unknown>): void {
  initJsonSchema = schema
}

export function getInitJsonSchema(): Record<string, unknown> | null {
  return initJsonSchema
}

export function resetSdkInitState(): void {
  initJsonSchema = null
  registeredHooks = null
}

// ── Test reset ──

export function resetHookRegistryState(): void {
  registeredHooks = null
  initJsonSchema = null
}
