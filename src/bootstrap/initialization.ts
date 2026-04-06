import { profileCheckpoint } from '../utils/startupProfiler.js';
import { startMdmRawRead } from '../utils/settings/mdm/rawRead.js';
import { startKeychainPrefetch } from '../utils/secureStorage/keychainPrefetch.js';

/**
 * Run startup initialization tasks in parallel.
 *
 * These operations were previously executed as module-level side effects during import,
 * which made initialization ordering fragile. This explicit function makes the order clear
 * and allows each operation to launch in parallel without blocking module resolution.
 *
 * Tasks:
 * 1. profileCheckpoint marks entry before heavy module evaluation begins
 * 2. startMdmRawRead fires MDM subprocesses (plutil/reg query) so they run in
 *    parallel with the remaining imports
 * 3. startKeychainPrefetch fires both macOS keychain reads (OAuth + legacy API key)
 *    in parallel — isRemoteManagedSettings() otherwise reads them sequentially via
 *    sync spawn inside applySafeConfigEnvironmentVariables() (~65ms on every macOS startup)
 */
export function runStartupInitialization(): void {
  profileCheckpoint('main_tsx_entry');
  startMdmRawRead();
  startKeychainPrefetch();
}
