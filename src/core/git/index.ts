/**
 * Git module
 *
 * Unified exports for git operations.
 */

// Types
export type { GitCommit, GitStatus, Worktree, WorktreeConfig } from "./types.js";
export { WorktreeConfigSchema, DEFAULT_WORKTREE_CONFIG } from "./types.js";

// Base operations
export {
  isGitRepo,
  isGitRepoAsync,
  getCurrentBranch,
  getCurrentBranchAsync,
  getGitStatus,
  getGitStatusAsync,
  getRecentCommits,
  getRecentCommitsAsync,
  getGitUserName,
  getGitUserEmail,
  branchExists,
  remoteBranchExists,
  getDefaultBranch,
  getShortStatus,
  getDiffStat,
} from "./base.js";

// Worktree operations
export {
  listWorktrees,
  createWorktree,
  removeWorktree,
  pruneWorktrees,
  getWorktreeByPath,
  getWorktreeByBranch,
  worktreeExistsForBranch,
} from "./worktree.js";

// Configuration
export {
  getWorktreeConfigPath,
  loadWorktreeConfig,
  saveWorktreeConfig,
  worktreeConfigExists,
  getWorktreeBaseDir,
  getWorktreeCopyFiles,
  getWorktreePostCreateHooks,
} from "./config.js";
