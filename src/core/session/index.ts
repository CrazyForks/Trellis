/**
 * Session module
 *
 * Manage development sessions and journals.
 */

// Schemas and types
export {
  SessionSchema,
  JournalInfoSchema,
  type Session,
  type JournalInfo,
  MAX_JOURNAL_LINES,
  parseSession,
  safeParseSession,
} from "./schemas.js";

// Journal operations
export {
  getJournalFiles,
  getActiveJournal,
  createJournalFile,
  rotateJournalIfNeeded,
  addSession,
  getJournalStatus,
} from "./journal.js";

// Workspace operations
export {
  updateWorkspaceIndex,
  getWorkspaceIndexPath,
} from "./workspace.js";
