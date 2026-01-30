/**
 * Task context management
 *
 * Manages context files (implement.jsonl, check.jsonl, debug.jsonl) for tasks.
 * Uses platform adapters for platform-specific context generation.
 */

import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../paths.js";
import { getPlatformAdapter } from "../platforms/index.js";
import { claudeAdapter } from "../platforms/claude/index.js";
import { readTask, writeTask } from "./crud.js";
import {
  type DevType,
  type ContextEntry,
  ContextEntrySchema,
} from "./schemas.js";

/**
 * Read JSONL entries from a file
 *
 * @param filePath - Path to JSONL file
 * @returns Array of context entries
 */
export function readJsonl(filePath: string): ContextEntry[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  return lines
    .map((line) => {
      try {
        const parsed = ContextEntrySchema.safeParse(JSON.parse(line));
        if (parsed.success) {
          return parsed.data;
        }
        return null;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is ContextEntry => entry !== null && entry.file !== "");
}

/**
 * Write JSONL entries to a file
 *
 * @param filePath - Path to JSONL file
 * @param entries - Context entries to write
 */
export function writeJsonl(filePath: string, entries: ContextEntry[]): void {
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(filePath, content);
}

/**
 * Initialize context files for a task
 *
 * Creates implement.jsonl, check.jsonl, and debug.jsonl files
 * based on the development type using the platform adapter.
 *
 * @param taskDir - Absolute path to task directory
 * @param devType - Development type
 * @param repoRoot - Repository root path
 */
export function initContext(
  taskDir: string,
  devType: DevType,
  repoRoot?: string,
): void {
  const root = repoRoot ?? getRepoRoot();

  // Update task.json with dev_type
  const task = readTask(taskDir);
  if (task) {
    writeTask(taskDir, { ...task, dev_type: devType });
  }

  // Get platform adapter and generate context files
  try {
    const adapter = getPlatformAdapter(root);
    adapter.generateContextFiles(taskDir, devType);
  } catch {
    // Fallback to Claude adapter if no platform detected
    // This ensures the CLI works even without platform config
    claudeAdapter.generateContextFiles(taskDir, devType);
  }
}

/**
 * Add a context entry to a JSONL file
 *
 * @param taskDir - Absolute path to task directory
 * @param jsonlName - JSONL file name (e.g., "implement", "check")
 * @param filePath - File or directory path to add
 * @param reason - Reason for including this context
 * @param repoRoot - Repository root path
 */
export function addContext(
  taskDir: string,
  jsonlName: string,
  filePath: string,
  reason: string,
  repoRoot?: string,
): void {
  const root = repoRoot ?? getRepoRoot();

  // Normalize jsonl name
  const jsonlFileName = jsonlName.endsWith(".jsonl")
    ? jsonlName
    : `${jsonlName}.jsonl`;
  const jsonlPath = path.join(taskDir, jsonlFileName);

  // Check if file/directory exists
  const fullPath = path.join(root, filePath);
  let entryType: "file" | "directory" = "file";

  if (fs.existsSync(fullPath)) {
    if (fs.statSync(fullPath).isDirectory()) {
      entryType = "directory";
      // Ensure trailing slash for directories
      if (!filePath.endsWith("/")) {
        filePath += "/";
      }
    }
  } else {
    throw new Error(`Path not found: ${filePath}`);
  }

  // Check if already exists
  const existing = readJsonl(jsonlPath);
  if (existing.some((e) => e.file === filePath)) {
    console.warn(`Warning: Entry already exists for ${filePath}`);
    return;
  }

  // Add entry
  const entry: ContextEntry =
    entryType === "directory"
      ? { file: filePath, type: "directory", reason }
      : { file: filePath, reason };

  fs.appendFileSync(jsonlPath, JSON.stringify(entry) + "\n");
}

/**
 * Validate JSONL context files
 *
 * Checks that all referenced files exist and JSONL format is valid.
 *
 * @param taskDir - Absolute path to task directory
 * @param repoRoot - Repository root path
 * @returns Validation results for each file
 */
export function validateContext(
  taskDir: string,
  repoRoot?: string,
): { file: string; errors: string[]; entryCount: number }[] {
  const root = repoRoot ?? getRepoRoot();
  const results: { file: string; errors: string[]; entryCount: number }[] = [];

  for (const jsonlName of ["implement.jsonl", "check.jsonl", "debug.jsonl"]) {
    const jsonlPath = path.join(taskDir, jsonlName);
    const errors: string[] = [];
    let entryCount = 0;

    if (!fs.existsSync(jsonlPath)) {
      results.push({ file: jsonlName, errors: ["File not found"], entryCount: 0 });
      continue;
    }

    const content = fs.readFileSync(jsonlPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      try {
        const parsed = ContextEntrySchema.safeParse(JSON.parse(line ?? "{}"));

        if (!parsed.success) {
          errors.push(`Line ${lineNum}: Invalid format - ${parsed.error.message}`);
          continue;
        }

        const entry = parsed.data;
        const fullPath = path.join(root, entry.file);
        const entryType = entry.type ?? "file";

        if (entryType === "directory") {
          if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
            errors.push(`Line ${lineNum}: Directory not found: ${entry.file}`);
          }
        } else {
          if (!fs.existsSync(fullPath)) {
            errors.push(`Line ${lineNum}: File not found: ${entry.file}`);
          }
        }

        entryCount++;
      } catch {
        errors.push(`Line ${lineNum}: Invalid JSON`);
      }
    }

    results.push({ file: jsonlName, errors, entryCount });
  }

  return results;
}

/**
 * List context entries from all JSONL files
 *
 * @param taskDir - Absolute path to task directory
 * @returns Context entries grouped by file
 */
export function listContext(
  taskDir: string,
): { file: string; entries: ContextEntry[] }[] {
  const results: { file: string; entries: ContextEntry[] }[] = [];

  for (const jsonlName of ["implement.jsonl", "check.jsonl", "debug.jsonl"]) {
    const jsonlPath = path.join(taskDir, jsonlName);
    const entries = readJsonl(jsonlPath);

    if (entries.length > 0) {
      results.push({ file: jsonlName, entries });
    }
  }

  return results;
}
