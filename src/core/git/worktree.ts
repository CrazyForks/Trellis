/**
 * Git worktree operations
 *
 * Manage git worktrees for multi-agent pipeline.
 */

import { execa } from "execa";
import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../paths.js";
import type { Worktree } from "./types.js";
import { loadWorktreeConfig } from "./config.js";

/**
 * Parse worktree list output (--porcelain format)
 *
 * Format:
 * worktree /path/to/worktree
 * HEAD abc123
 * branch refs/heads/branch-name
 * (blank line between entries)
 */
function parseWorktreeOutput(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  const entries = output.split("\n\n").filter(Boolean);

  for (const entry of entries) {
    const lines = entry.split("\n");
    const worktree: Partial<Worktree> = {
      isMain: false,
      isBare: false,
    };

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktree.path = line.substring(9);
      } else if (line.startsWith("HEAD ")) {
        worktree.head = line.substring(5);
      } else if (line.startsWith("branch ")) {
        const branchRef = line.substring(7);
        // Convert refs/heads/branch-name to branch-name
        worktree.branch = branchRef.replace("refs/heads/", "");
      } else if (line === "bare") {
        worktree.isBare = true;
      } else if (line === "detached") {
        worktree.branch = null;
      }
    }

    // Check if this is the main worktree (first entry without "branch" is usually main)
    if (worktree.path && !worktree.isBare) {
      worktrees.push(worktree as Worktree);
    }
  }

  // Mark the first non-bare worktree as main
  if (worktrees.length > 0 && worktrees[0]) {
    worktrees[0].isMain = true;
  }

  return worktrees;
}

/**
 * List all worktrees
 *
 * @param repoRoot - Repository root path
 * @returns Array of worktree information
 */
export async function listWorktrees(repoRoot?: string): Promise<Worktree[]> {
  const cwd = repoRoot ?? getRepoRoot();

  try {
    const { stdout } = await execa("git", ["worktree", "list", "--porcelain"], {
      cwd,
    });
    return parseWorktreeOutput(stdout);
  } catch {
    return [];
  }
}

/**
 * Create a new worktree
 *
 * @param branchName - Name for the new branch
 * @param worktreePath - Path where the worktree will be created (optional)
 * @param baseBranch - Base branch to create from (optional, defaults to current branch)
 * @param repoRoot - Repository root path
 * @returns Path to the created worktree
 */
export async function createWorktree(
  branchName: string,
  worktreePath?: string,
  baseBranch?: string,
  repoRoot?: string,
): Promise<string> {
  const cwd = repoRoot ?? getRepoRoot();

  // Load worktree config for base directory
  const config = loadWorktreeConfig(cwd);
  const baseDir = config.base_dir ?? "../.worktrees";

  // Generate worktree path if not provided
  const targetPath =
    worktreePath ?? path.resolve(cwd, baseDir, branchName);

  // Ensure parent directory exists
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Build git command
  const args = ["worktree", "add"];

  if (baseBranch) {
    // Create from specific base branch
    args.push("-b", branchName, targetPath, baseBranch);
  } else {
    // Create new branch from current HEAD
    args.push("-b", branchName, targetPath);
  }

  await execa("git", args, { cwd });

  // Copy files if configured
  if (config.copy_files && config.copy_files.length > 0) {
    for (const file of config.copy_files) {
      const srcPath = path.join(cwd, file);
      const destPath = path.join(targetPath, file);

      if (fs.existsSync(srcPath)) {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Run post-create hooks if configured
  if (config.post_create && config.post_create.length > 0) {
    for (const cmd of config.post_create) {
      try {
        await execa(cmd, { cwd: targetPath, shell: true });
      } catch {
        console.warn(`Warning: Post-create hook failed: ${cmd}`);
      }
    }
  }

  return targetPath;
}

/**
 * Remove a worktree
 *
 * @param worktreePath - Path to the worktree to remove
 * @param force - Force removal even if there are uncommitted changes
 * @param repoRoot - Repository root path
 */
export async function removeWorktree(
  worktreePath: string,
  force = false,
  repoRoot?: string,
): Promise<void> {
  const cwd = repoRoot ?? getRepoRoot();

  const args = ["worktree", "remove"];
  if (force) {
    args.push("--force");
  }
  args.push(worktreePath);

  await execa("git", args, { cwd });
}

/**
 * Prune stale worktree entries
 *
 * @param repoRoot - Repository root path
 */
export async function pruneWorktrees(repoRoot?: string): Promise<void> {
  const cwd = repoRoot ?? getRepoRoot();
  await execa("git", ["worktree", "prune"], { cwd });
}

/**
 * Get worktree by path
 *
 * @param worktreePath - Path to search for
 * @param repoRoot - Repository root path
 * @returns Worktree info or null if not found
 */
export async function getWorktreeByPath(
  worktreePath: string,
  repoRoot?: string,
): Promise<Worktree | null> {
  const worktrees = await listWorktrees(repoRoot);
  const normalizedPath = path.resolve(worktreePath);

  return (
    worktrees.find((wt) => path.resolve(wt.path) === normalizedPath) ?? null
  );
}

/**
 * Get worktree by branch name
 *
 * @param branchName - Branch name to search for
 * @param repoRoot - Repository root path
 * @returns Worktree info or null if not found
 */
export async function getWorktreeByBranch(
  branchName: string,
  repoRoot?: string,
): Promise<Worktree | null> {
  const worktrees = await listWorktrees(repoRoot);
  return worktrees.find((wt) => wt.branch === branchName) ?? null;
}

/**
 * Check if a worktree exists for the given branch
 */
export async function worktreeExistsForBranch(
  branchName: string,
  repoRoot?: string,
): Promise<boolean> {
  const worktree = await getWorktreeByBranch(branchName, repoRoot);
  return worktree !== null;
}
