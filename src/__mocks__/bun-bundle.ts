// Stub for bun:bundle when running under vitest/Node
// Under bun, feature() is replaced at compile time by the bundler.
// In tests, all feature flags default to false.
export const feature = (_flag: string): boolean => false
