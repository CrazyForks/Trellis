/**
 * Workspace index.md management
 *
 * Update auto-generated sections in workspace/index.md.
 */

import fs from "node:fs";
import path from "node:path";
import { getRepoRoot, getWorkspaceDir, FILE_NAMES } from "../paths.js";
import { getDeveloper, countLines } from "../developer/index.js";
import { getJournalFiles } from "./journal.js";
import { type Session, MAX_JOURNAL_LINES } from "./schemas.js";

/**
 * Auto-update markers in index.md
 */
const MARKERS = {
  CURRENT_STATUS: {
    start: "<!-- @@@auto:current-status -->",
    end: "<!-- @@@/auto:current-status -->",
  },
  ACTIVE_DOCUMENTS: {
    start: "<!-- @@@auto:active-documents -->",
    end: "<!-- @@@/auto:active-documents -->",
  },
  SESSION_HISTORY: {
    start: "<!-- @@@auto:session-history -->",
    end: "<!-- @@@/auto:session-history -->",
  },
};

/**
 * Replace content between markers
 */
function replaceMarkerContent(
  content: string,
  marker: { start: string; end: string },
  newContent: string,
): string {
  const startIdx = content.indexOf(marker.start);
  const endIdx = content.indexOf(marker.end);

  if (startIdx === -1 || endIdx === -1) {
    return content;
  }

  const before = content.substring(0, startIdx + marker.start.length);
  const after = content.substring(endIdx);

  return `${before}\n${newContent}\n${after}`;
}

/**
 * Generate current status section content
 */
function generateCurrentStatus(
  activeFile: string,
  totalSessions: number,
  lastActive: string,
): string {
  return `- **Active File**: \`${activeFile}\`
- **Total Sessions**: ${totalSessions}
- **Last Active**: ${lastActive}`;
}

/**
 * Generate active documents section content
 */
function generateActiveDocuments(
  journals: { path: string; number: number }[],
): string {
  const rows = ["| File | Lines | Status |", "|------|-------|--------|"];

  for (const journal of journals) {
    const lines = countLines(journal.path);
    const fileName = path.basename(journal.path);
    const isActive = journal.number === journals[journals.length - 1]?.number;
    const status =
      lines >= MAX_JOURNAL_LINES ? "Full" : isActive ? "Active" : "Archived";

    rows.push(`| \`${fileName}\` | ~${lines} | ${status} |`);
  }

  return rows.join("\n");
}

/**
 * Generate session history section content (most recent 10)
 */
function generateSessionHistory(
  sessions: {
    number: number;
    date: string;
    title: string;
    commit: string | null;
  }[],
): string {
  const rows = ["| # | Date | Title | Commits |", "|---|------|-------|---------|"];

  // Take the most recent 10 sessions
  const recent = sessions.slice(-10).reverse();

  for (const session of recent) {
    const commitStr = session.commit ? `\`${session.commit}\`` : "-";
    rows.push(`| ${session.number} | ${session.date} | ${session.title} | ${commitStr} |`);
  }

  return rows.join("\n");
}

/**
 * Extract session info from journal files
 */
function extractSessionsFromJournals(
  journals: { path: string; number: number }[],
): {
  number: number;
  date: string;
  title: string;
  commit: string | null;
}[] {
  const sessions: {
    number: number;
    date: string;
    title: string;
    commit: string | null;
  }[] = [];

  for (const journal of journals) {
    if (!fs.existsSync(journal.path)) {
      continue;
    }

    const content = fs.readFileSync(journal.path, "utf-8");

    // Match session headers: "## Session N: Title"
    const sessionRegex = /^## Session (\d+): (.+)$/gm;

    let match;
    while ((match = sessionRegex.exec(content)) !== null) {
      const sessionNum = parseInt(match[1], 10);
      const title = match[2].trim();

      // Find the date after this session header
      const afterHeader = content.substring(match.index);
      const dateMatch = afterHeader.match(/^\*\*Date\*\*: (\d{4}-\d{2}-\d{2})/m);
      const commitMatch = afterHeader.match(/^\*\*Commit\*\*: `([^`]+)`/m);

      sessions.push({
        number: sessionNum,
        date: dateMatch ? dateMatch[1] : "unknown",
        title,
        commit: commitMatch ? commitMatch[1] : null,
      });
    }
  }

  return sessions.sort((a, b) => a.number - b.number);
}

/**
 * Update workspace index.md
 *
 * Updates the auto-generated sections with current information.
 *
 * @param session - Optional session info for the new session
 * @param repoRoot - Repository root path
 */
export function updateWorkspaceIndex(
  session?: Session,
  repoRoot?: string,
): void {
  const root = repoRoot ?? getRepoRoot();
  const developer = getDeveloper(root);

  if (!developer) {
    throw new Error("Developer not initialized");
  }

  const workspaceDir = getWorkspaceDir(developer, root);
  const indexPath = path.join(workspaceDir, "index.md");

  if (!fs.existsSync(indexPath)) {
    console.warn("Warning: index.md not found in workspace");
    return;
  }

  let content = fs.readFileSync(indexPath, "utf-8");
  const journals = getJournalFiles(developer, root);
  const sessions = extractSessionsFromJournals(journals);

  // Get active journal info
  const activeJournal = journals[journals.length - 1];
  const activeFile = activeJournal
    ? `${FILE_NAMES.JOURNAL_PREFIX}${activeJournal.number}.md`
    : "journal-1.md";
  const totalSessions = sessions.length;
  const lastActive =
    sessions.length > 0
      ? sessions[sessions.length - 1]?.date ?? "-"
      : "-";

  // Update current status
  content = replaceMarkerContent(
    content,
    MARKERS.CURRENT_STATUS,
    generateCurrentStatus(activeFile, totalSessions, lastActive),
  );

  // Update active documents
  content = replaceMarkerContent(
    content,
    MARKERS.ACTIVE_DOCUMENTS,
    generateActiveDocuments(journals),
  );

  // Update session history
  content = replaceMarkerContent(
    content,
    MARKERS.SESSION_HISTORY,
    generateSessionHistory(sessions),
  );

  fs.writeFileSync(indexPath, content);
}

/**
 * Get workspace index path
 */
export function getWorkspaceIndexPath(repoRoot?: string): string | null {
  const root = repoRoot ?? getRepoRoot();
  const developer = getDeveloper(root);

  if (!developer) {
    return null;
  }

  const workspaceDir = getWorkspaceDir(developer, root);
  const indexPath = path.join(workspaceDir, "index.md");

  return fs.existsSync(indexPath) ? indexPath : null;
}
