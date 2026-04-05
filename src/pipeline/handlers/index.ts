/**
 * Built-in command handlers.
 *
 * Each handler is a self-describing object that can be registered with CommandBus.
 * Handlers are returned sorted by priority (higher number = higher priority).
 */

import type { CommandHandler } from '../CommandBus.js'

import { helpHandler } from './HelpHandler.js'
import { clearHandler } from './ClearHandler.js'
import { statusHandler } from './StatusHandler.js'
import { loginHandler } from './LoginHandler.js'
import { logoutHandler } from './LogoutHandler.js'
import { configHandler } from './ConfigHandler.js'
import { copyHandler } from './CopyHandler.js'
import { diffHandler } from './DiffHandler.js'
import { commitHandler } from './CommitHandler.js'
import { reviewHandler } from './ReviewHandler.js'
import { mergeHandler } from './MergeHandler.js'
import { sessionHandler } from './SessionHandler.js'
import { resumeHandler } from './ResumeHandler.js'
import { teleportHandler } from './TeleportHandler.js'
import { memoryHandler } from './MemoryHandler.js'
import { skillsHandler } from './SkillsHandler.js'
import { mcpHandler } from './McpHandler.js'
import { doctorHandler } from './DoctorHandler.js'
import { versionHandler } from './VersionHandler.js'
import { exitHandler } from './ExitHandler.js'
import { searchHandler } from './SearchHandler.js'
import { listHandler } from './ListHandler.js'
import { showHandler } from './ShowHandler.js'
import { editHandler } from './EditHandler.js'
import { deleteHandler } from './DeleteHandler.js'
import { authHandler } from './AuthHandler.js'
import { tokenHandler } from './TokenHandler.js'
import { exportHandler } from './ExportHandler.js'
import { importHandler } from './ImportHandler.js'
import { resetHandler } from './ResetHandler.js'
import { compactHandler } from './CompactHandler.js'
import { costHandler } from './CostHandler.js'
import { modelHandler } from './ModelHandler.js'

// Re-export individual handlers for direct access
export { helpHandler } from './HelpHandler.js'
export { clearHandler } from './ClearHandler.js'
export { statusHandler } from './StatusHandler.js'
export { loginHandler } from './LoginHandler.js'
export { logoutHandler } from './LogoutHandler.js'
export { configHandler } from './ConfigHandler.js'
export { copyHandler } from './CopyHandler.js'
export { diffHandler } from './DiffHandler.js'
export { commitHandler } from './CommitHandler.js'
export { reviewHandler } from './ReviewHandler.js'
export { mergeHandler } from './MergeHandler.js'
export { sessionHandler } from './SessionHandler.js'
export { resumeHandler } from './ResumeHandler.js'
export { teleportHandler } from './TeleportHandler.js'
export { memoryHandler } from './MemoryHandler.js'
export { skillsHandler } from './SkillsHandler.js'
export { mcpHandler } from './McpHandler.js'
export { doctorHandler } from './DoctorHandler.js'
export { versionHandler } from './VersionHandler.js'
export { exitHandler } from './ExitHandler.js'
export { searchHandler } from './SearchHandler.js'
export { listHandler } from './ListHandler.js'
export { showHandler } from './ShowHandler.js'
export { editHandler } from './EditHandler.js'
export { deleteHandler } from './DeleteHandler.js'
export { authHandler } from './AuthHandler.js'
export { tokenHandler } from './TokenHandler.js'
export { exportHandler } from './ExportHandler.js'
export { importHandler } from './ImportHandler.js'
export { resetHandler } from './ResetHandler.js'
export { compactHandler } from './CompactHandler.js'
export { costHandler } from './CostHandler.js'
export { modelHandler } from './ModelHandler.js'

/**
 * All built-in handlers as an array.
 */
const allHandlers: CommandHandler[] = [
  helpHandler,
  clearHandler,
  exitHandler,
  statusHandler,
  loginHandler,
  logoutHandler,
  authHandler,
  tokenHandler,
  configHandler,
  modelHandler,
  sessionHandler,
  resumeHandler,
  commitHandler,
  reviewHandler,
  diffHandler,
  mergeHandler,
  copyHandler,
  compactHandler,
  searchHandler,
  teleportHandler,
  memoryHandler,
  skillsHandler,
  mcpHandler,
  doctorHandler,
  versionHandler,
  costHandler,
  listHandler,
  showHandler,
  editHandler,
  deleteHandler,
  exportHandler,
  importHandler,
  resetHandler,
]

/**
 * Get all built-in command handlers sorted by priority (highest first).
 *
 * Usage:
 * ```ts
 * const bus = new CommandBus()
 * getBuiltInHandlers().forEach(h => bus.register(h))
 * ```
 */
export function getBuiltInHandlers(): CommandHandler[] {
  return [...allHandlers].sort((a, b) => b.priority - a.priority)
}
