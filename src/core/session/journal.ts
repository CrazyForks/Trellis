/**
 * Journal file operations
 *
 * Manage journal files for recording development sessions.
 */

import fs from "node:fs";
import path from "node:path";
import { getRepoRoot, getWorkspaceDir, FILE_NAMES } from "../paths.js";
import { getDeveloper, countLines } from "../developer/index.js";
import { type Session, type JournalInfo, MAX_JOURNAL_LINES } from "./schemas.js";

/**
 * Get all journal files for a developer
 *
 * @param developer - Developer name
 * @param repoRoot - Repository root path
 * @returns Array of journal file info sorted by number
 */
export function getJournalFiles(
  developer: string,
  repoRoot?: string,
): { path: string; number: number }[] {
  const root = repoRoot ?? getRepoRoot();
  const workspaceDir = getWorkspaceDir(developer, root);

  if (!fs.existsSync(workspaceDir)) {
    return [];
  }

  const files = fs.readdirSync(workspaceDir);
  const journals: { path: string; number: number }[] = [];

  for (const file of files) {
    const match = file.match(
      new RegExp(`^${FILE_NAMES.JOURNAL_PREFIX}(\\d+)\\.md$`),
    );
    if (match?.[1]) {
      journals.push({
        path: path.join(workspaceDir, file),
        number: parseInt(match[1], 10),
      });
    }
  }

  // Sort by number
  return journals.sort((a, b) => a.number - b.number);
}

/**
 * Get the active (latest) journal file info
 *
 * @param repoRoot - Repository root path
 * @returns Journal info or null if not initialized
 */
export function getActiveJournal(repoRoot?: string): JournalInfo | null {
  const root = repoRoot ?? getRepoRoot();
  const developer = getDeveloper(root);

  if (!developer) {
    return null;
  }

  const journals = getJournalFiles(developer, root);

  if (journals.length === 0) {
    return null;
  }

  // Get the highest numbered journal
  const latest = journals[journals.length - 1];
  if (!latest) {
    return null;
  }

  const lineCount = countLines(latest.path);

  return {
    filePath: latest.path,
    relativePath: path.relative(root, latest.path),
    lineCount,
    fileNumber: latest.number,
    sessionCount: getTotalSessionCount(developer, root),
  };
}

/**
 * Count sessions in a journal file
 *
 * Sessions are marked with "## Session N:" header
 */
function countSessionsInFile(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const matches = content.match(/^## Session \d+:/gm);
  return matches ? matches.length : 0;
}

/**
 * Get total session count across all journal files
 */
function getTotalSessionCount(developer: string, repoRoot?: string): number {
  const journals = getJournalFiles(developer, repoRoot);
  let total = 0;

  for (const journal of journals) {
    total += countSessionsInFile(journal.path);
  }

  return total;
}

/**
 * Create a new journal file
 *
 * @param developer - Developer name
 * @param fileNumber - Journal file number
 * @param repoRoot - Repository root path
 * @returns Path to the new journal file
 */
export function createJournalFile(
  developer: string,
  fileNumber: number,
  repoRoot?: string,
): string {
  const root = repoRoot ?? getRepoRoot();
  const workspaceDir = getWorkspaceDir(developer, root);

  // Ensure workspace directory exists
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  const fileName = `${FILE_NAMES.JOURNAL_PREFIX}${fileNumber}.md`;
  const filePath = path.join(workspaceDir, fileName);
  const today = new Date().toISOString().split("T")[0];

  fs.writeFileSync(
    filePath,
    `# Journal - ${developer} (Part ${fileNumber})

> AI development session journal
> Started: ${today}

---

`,
  );

  return filePath;
}

/**
 * Rotate journal file if needed
 *
 * Creates a new journal file if the current one exceeds MAX_JOURNAL_LINES.
 *
 * @param repoRoot - Repository root path
 * @returns Path to the active journal file
 */
export function rotateJournalIfNeeded(repoRoot?: string): string {
  const root = repoRoot ?? getRepoRoot();
  const developer = getDeveloper(root);

  if (!developer) {
    throw new Error("Developer not initialized");
  }

  const activeJournal = getActiveJournal(root);

  if (!activeJournal) {
    // No journal exists, create the first one
    return createJournalFile(developer, 1, root);
  }

  if (activeJournal.lineCount >= MAX_JOURNAL_LINES) {
    // Create new journal file
    const newNumber = activeJournal.fileNumber + 1;
    return createJournalFile(developer, newNumber, root);
  }

  return activeJournal.filePath;
}

/**
 * Generate session content
 */
function generateSessionContent(
  sessionNumber: number,
  session: Session,
): string {
  const timestamp = session.timestamp ?? new Date().toISOString();
  const date = timestamp.split("T")[0];

  let content = `## Session ${sessionNumber}: ${session.title}

**Date**: ${date}
`;

  if (session.commit) {
    content += `**Commit**: \`${session.commit}\`\n`;
  }

  content += "\n";

  if (session.summary) {
    content += `### Summary\n\n${session.summary}\n\n`;
  }

  if (session.content) {
    content += `### Details\n\n${session.content}\n\n`;
  }

  content += "---\n\n";

  return content;
}

/**
 * Add a session to the journal
 *
 * @param session - Session data
 * @param repoRoot - Repository root path
 * @returns Session number
 */
export function addSession(session: Session, repoRoot?: string): number {
  const root = repoRoot ?? getRepoRoot();
  const developer = getDeveloper(root);

  if (!developer) {
    throw new Error("Developer not initialized");
  }

  // Ensure we have a valid journal file (rotate if needed)
  const journalPath = rotateJournalIfNeeded(root);

  // Get the next session number
  const totalSessions = getTotalSessionCount(developer, root);
  const sessionNumber = totalSessions + 1;

  // Generate and append session content
  const content = generateSessionContent(sessionNumber, session);
  fs.appendFileSync(journalPath, content);

  return sessionNumber;
}

/**
 * Get journal info formatted for display
 */
export function getJournalStatus(repoRoot?: string): {
  activeFile: string | null;
  lineCount: number;
  maxLines: number;
  totalSessions: number;
  fileNumber: number;
} {
  const journal = getActiveJournal(repoRoot);

  if (!journal) {
    return {
      activeFile: null,
      lineCount: 0,
      maxLines: MAX_JOURNAL_LINES,
      totalSessions: 0,
      fileNumber: 0,
    };
  }

  return {
    activeFile: journal.relativePath,
    lineCount: journal.lineCount,
    maxLines: MAX_JOURNAL_LINES,
    totalSessions: journal.sessionCount,
    fileNumber: journal.fileNumber,
  };
}
