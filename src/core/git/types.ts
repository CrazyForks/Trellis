/**
 * Git module types
 */

import { z } from "zod";

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  message: string;
}

/**
 * Git status information
 */
export interface GitStatus {
  branch: string;
  isClean: boolean;
  uncommittedChanges: number;
  changes: string[];
}

/**
 * Git worktree information
 */
export interface Worktree {
  /** Worktree path */
  path: string;
  /** HEAD commit hash */
  head: string;
  /** Branch name (if checked out) */
  branch: string | null;
  /** Whether this is the main worktree */
  isMain: boolean;
  /** Whether this is a bare repository */
  isBare: boolean;
}

/**
 * Worktree configuration schema (from worktree.yaml)
 */
export const WorktreeConfigSchema = z.object({
  /** Base directory for worktrees (relative to repo root) */
  base_dir: z.string().optional(),
  /** Files to copy when creating a worktree */
  copy_files: z.array(z.string()).optional(),
  /** Commands to run after creating a worktree */
  post_create: z.array(z.string()).optional(),
});

export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;

/**
 * Default worktree configuration
 */
export const DEFAULT_WORKTREE_CONFIG: WorktreeConfig = {
  base_dir: "../.worktrees",
  copy_files: [".env", ".env.local"],
  post_create: [],
};
