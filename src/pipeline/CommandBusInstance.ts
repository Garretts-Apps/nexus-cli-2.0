/**
 * CommandBus singleton factory.
 *
 * Provides a lazily-initialized, shared CommandBus instance pre-loaded with
 * all built-in handlers. Import getOrCreateBus() wherever a CommandBus is
 * needed without re-registering handlers.
 */

import { CommandBus } from './CommandBus.js'
import { getBuiltInHandlers } from './handlers/index.js'

let _bus: CommandBus | undefined

/**
 * Returns the shared CommandBus, creating and populating it on first call.
 *
 * Thread-safety: single-threaded JS event loop means no race condition.
 */
export function getOrCreateBus(): CommandBus {
  if (!_bus) {
    _bus = new CommandBus()
    for (const handler of getBuiltInHandlers()) {
      _bus.register(handler)
    }
  }
  return _bus
}

/**
 * Replace the shared bus (for testing only).
 * @internal
 */
export function _resetBusForTesting(bus?: CommandBus): void {
  _bus = bus
}
