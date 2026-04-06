/**
 * Re-export state accessors needed by CLI parser to avoid circular dependencies.
 * The CLI parser needs access to bootstrap state but importing directly from
 * bootstrap/state.ts can create circular dependency chains.
 */
export { getOriginalCwd, setCwdState } from '../bootstrap/state.js';
