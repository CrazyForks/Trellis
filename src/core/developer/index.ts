/**
 * Developer management utilities
 */

import fs from "node:fs";
import path from "node:path";
import {
  getDeveloperFilePath,
  getRepoRoot,
  getWorkspaceDir,
  PATHS,
  FILE_NAMES,
} from "../paths.js";
import type { Developer, DeveloperInfo } from "./schemas.js";

// Re-export schemas
export {
  DeveloperSchema,
  DeveloperInfoSchema,
  type Developer,
  type DeveloperInfo,
  parseDeveloper,
  safeParseDeveloper,
} from "./schemas.js";

/**
 * Get the current developer name
 *
 * @param repoRoot - Repository root path
 * @returns Developer name or null if not initialized
 */
export function getDeveloper(repoRoot?: string): string | null {
  const filePath = getDeveloperFilePath(repoRoot);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^name=(.+)$/m);

  return match ? match[1].trim() : null;
}

/**
 * Get full developer info
 *
 * @param repoRoot - Repository root path
 * @returns Developer info or null if not initialized
 */
export function getDeveloperRecord(repoRoot?: string): Developer | null {
  const filePath = getDeveloperFilePath(repoRoot);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const nameMatch = content.match(/^name=(.+)$/m);
  const dateMatch = content.match(/^initialized_at=(.+)$/m);

  if (!nameMatch) {
    return null;
  }

  return {
    name: nameMatch[1].trim(),
    initialized_at: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
  };
}

/**
 * Get full developer info (alias for getDeveloperRecord)
 *
 * @param repoRoot - Repository root path
 * @returns Developer info or null if not initialized
 */
export const getDeveloperInfo = getDeveloperRecord;

/**
 * Check if developer is initialized
 *
 * @param repoRoot - Repository root path
 * @returns True if developer is initialized
 */
export function isDeveloperInitialized(repoRoot?: string): boolean {
  return getDeveloper(repoRoot) !== null;
}

/**
 * Initialize developer identity
 *
 * Creates .developer file and workspace directory structure.
 *
 * @param name - Developer name
 * @param repoRoot - Repository root path
 */
export function initDeveloper(name: string, repoRoot?: string): void {
  if (!name) {
    throw new Error("Developer name is required");
  }

  const root = repoRoot ?? getRepoRoot();
  const devFilePath = getDeveloperFilePath(root);
  const workspaceDir = getWorkspaceDir(name, root);

  // Ensure .trellis directory exists
  const trellisDir = path.dirname(devFilePath);
  if (!fs.existsSync(trellisDir)) {
    fs.mkdirSync(trellisDir, { recursive: true });
  }

  // Create .developer file
  const now = new Date().toISOString();
  fs.writeFileSync(devFilePath, `name=${name}\ninitialized_at=${now}\n`);

  // Create workspace directory structure
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // Create initial journal file
  const journalFile = path.join(workspaceDir, `${FILE_NAMES.JOURNAL_PREFIX}1.md`);
  if (!fs.existsSync(journalFile)) {
    const today = new Date().toISOString().split("T")[0];
    fs.writeFileSync(
      journalFile,
      `# Journal - ${name} (Part 1)

> AI development session journal
> Started: ${today}

---

`,
    );
  }

  // Create index.md
  const indexFile = path.join(workspaceDir, "index.md");
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(
      indexFile,
      `# Workspace Index - ${name}

> Journal tracking for AI development sessions.

---

## Current Status

<!-- @@@auto:current-status -->
- **Active File**: \`journal-1.md\`
- **Total Sessions**: 0
- **Last Active**: -
<!-- @@@/auto:current-status -->

---

## Active Documents

<!-- @@@auto:active-documents -->
| File | Lines | Status |
|------|-------|--------|
| \`journal-1.md\` | ~0 | Active |
<!-- @@@/auto:active-documents -->

---

## Session History

<!-- @@@auto:session-history -->
| # | Date | Title | Commits |
|---|------|-------|---------|
<!-- @@@/auto:session-history -->

---

## Notes

- Sessions are appended to journal files
- New journal file created when current exceeds 2000 lines
- Use \`trellis session add\` to record sessions
`,
    );
  }
}

/**
 * Ensure developer is initialized
 *
 * @param repoRoot - Repository root path
 * @returns Developer name
 * @throws Error if developer is not initialized
 */
export function ensureDeveloper(repoRoot?: string): string {
  const developer = getDeveloper(repoRoot);

  if (!developer) {
    throw new Error(
      "Developer not initialized. Run: trellis init -u <your-name>",
    );
  }

  return developer;
}

/**
 * Get active journal file path
 *
 * @param repoRoot - Repository root path
 * @returns Path to active journal file or null
 */
export function getActiveJournalFile(repoRoot?: string): string | null {
  const developer = getDeveloper(repoRoot);

  if (!developer) {
    return null;
  }

  const root = repoRoot ?? getRepoRoot();
  const workspaceDir = getWorkspaceDir(developer, root);

  if (!fs.existsSync(workspaceDir)) {
    return null;
  }

  // Find the highest numbered journal file
  const files = fs.readdirSync(workspaceDir);
  let highest = 0;
  let latestFile: string | null = null;

  for (const file of files) {
    const match = file.match(
      new RegExp(`^${FILE_NAMES.JOURNAL_PREFIX}(\\d+)\\.md$`),
    );
    if (match?.[1]) {
      const num = parseInt(match[1], 10);
      if (num > highest) {
        highest = num;
        latestFile = path.join(workspaceDir, file);
      }
    }
  }

  return latestFile;
}

/**
 * Count lines in a file
 *
 * @param filePath - Path to file
 * @returns Number of lines
 */
export function countLines(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

/**
 * Get developer info formatted for display
 *
 * @param repoRoot - Repository root path
 * @returns Developer info object
 */
export function showDeveloperInfo(repoRoot?: string): DeveloperInfo {
  const developer = getDeveloper(repoRoot);
  const journalFile = getActiveJournalFile(repoRoot);
  const root = repoRoot ?? getRepoRoot();

  return {
    name: developer,
    workspacePath: developer ? `${PATHS.WORKSPACE}/${developer}/` : null,
    journalFile: journalFile ? path.relative(root, journalFile) : null,
    journalLines: journalFile ? countLines(journalFile) : 0,
  };
}
