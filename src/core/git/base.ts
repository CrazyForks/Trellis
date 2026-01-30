/**
 * Git base operations
 *
 * Basic git commands using execa for cross-platform compatibility.
 */

import { execSync } from "node:child_process";
import { execa } from "execa";
import { getRepoRoot } from "../paths.js";
import type { GitCommit, GitStatus } from "./types.js";

/**
 * Execute a git command and return the output
 *
 * @param args - Git command arguments
 * @param options - Execution options
 * @returns Command output (stdout)
 */
async function execGit(
  args: string[],
  options?: { cwd?: string; silent?: boolean },
): Promise<string> {
  const cwd = options?.cwd ?? getRepoRoot();

  try {
    const result = await execa("git", args, {
      cwd,
      reject: false,
    });

    const stdout = result.stdout;
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Execute a git command synchronously (for backward compatibility)
 *
 * Note: Prefer async versions when possible.
 */
function execGitSync(
  args: string[],
  options?: { cwd?: string; silent?: boolean },
): string {
  const cwd = options?.cwd ?? getRepoRoot();

  try {
    const result = execSync(`git ${args.join(" ")}`, {
      cwd,
      encoding: "utf-8",
      stdio: options?.silent ? "pipe" : undefined,
    });
    return result.trim();
  } catch {
    return "";
  }
}

/**
 * Check if the current directory is inside a git repository
 */
export function isGitRepo(cwd?: string): boolean {
  const result = execGitSync(["rev-parse", "--is-inside-work-tree"], {
    cwd,
    silent: true,
  });
  return result === "true";
}

/**
 * Check if the current directory is inside a git repository (async)
 */
export async function isGitRepoAsync(cwd?: string): Promise<boolean> {
  const result = await execGit(["rev-parse", "--is-inside-work-tree"], {
    cwd,
    silent: true,
  });
  return result === "true";
}

/**
 * Get the current git branch name
 */
export function getCurrentBranch(cwd?: string): string {
  return (
    execGitSync(["branch", "--show-current"], { cwd, silent: true }) || "unknown"
  );
}

/**
 * Get the current git branch name (async)
 */
export async function getCurrentBranchAsync(cwd?: string): Promise<string> {
  const result = await execGit(["branch", "--show-current"], {
    cwd,
    silent: true,
  });
  return result || "unknown";
}

/**
 * Get git status summary
 */
export function getGitStatus(cwd?: string): GitStatus {
  const branch = getCurrentBranch(cwd);
  const statusOutput = execGitSync(["status", "--porcelain"], {
    cwd,
    silent: true,
  });
  const changes = statusOutput ? statusOutput.split("\n").filter(Boolean) : [];

  return {
    branch,
    isClean: changes.length === 0,
    uncommittedChanges: changes.length,
    changes,
  };
}

/**
 * Get git status summary (async)
 */
export async function getGitStatusAsync(cwd?: string): Promise<GitStatus> {
  const branch = await getCurrentBranchAsync(cwd);
  const statusOutput = await execGit(["status", "--porcelain"], {
    cwd,
    silent: true,
  });
  const changes = statusOutput ? statusOutput.split("\n").filter(Boolean) : [];

  return {
    branch,
    isClean: changes.length === 0,
    uncommittedChanges: changes.length,
    changes,
  };
}

/**
 * Get recent commits
 */
export function getRecentCommits(count = 5, cwd?: string): GitCommit[] {
  const output = execGitSync(["log", "--oneline", `-${count}`], {
    cwd,
    silent: true,
  });

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [hash, ...messageParts] = line.split(" ");
    return {
      hash: hash ?? "",
      message: messageParts.join(" "),
    };
  });
}

/**
 * Get recent commits (async)
 */
export async function getRecentCommitsAsync(
  count = 5,
  cwd?: string,
): Promise<GitCommit[]> {
  const output = await execGit(["log", "--oneline", `-${count}`], {
    cwd,
    silent: true,
  });

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [hash, ...messageParts] = line.split(" ");
    return {
      hash: hash ?? "",
      message: messageParts.join(" "),
    };
  });
}

/**
 * Get the git user name from config
 */
export function getGitUserName(cwd?: string): string | null {
  const name = execGitSync(["config", "user.name"], { cwd, silent: true });
  return name || null;
}

/**
 * Get the git user email from config
 */
export function getGitUserEmail(cwd?: string): string | null {
  const email = execGitSync(["config", "user.email"], { cwd, silent: true });
  return email || null;
}

/**
 * Check if a branch exists locally
 */
export function branchExists(branchName: string, cwd?: string): boolean {
  const output = execGitSync(["branch", "--list", branchName], {
    cwd,
    silent: true,
  });
  return output.trim().length > 0;
}

/**
 * Check if a branch exists on remote
 */
export function remoteBranchExists(
  branchName: string,
  remote = "origin",
  cwd?: string,
): boolean {
  const output = execGitSync(["ls-remote", "--heads", remote, branchName], {
    cwd,
    silent: true,
  });
  return output.trim().length > 0;
}

/**
 * Get the default branch name (main or master)
 */
export function getDefaultBranch(cwd?: string): string {
  // Try to get from remote
  const remoteHead = execGitSync(
    ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
    { cwd, silent: true },
  );

  if (remoteHead) {
    return remoteHead.replace("origin/", "");
  }

  // Fallback: check if main or master exists
  if (branchExists("main", cwd)) {
    return "main";
  }

  if (branchExists("master", cwd)) {
    return "master";
  }

  return "main";
}

/**
 * Get short status for display
 */
export function getShortStatus(cwd?: string): string[] {
  const output = execGitSync(["status", "--short"], { cwd, silent: true });

  if (!output) {
    return [];
  }

  return output.split("\n").slice(0, 10);
}

/**
 * Get diff stat against a base branch
 */
export function getDiffStat(baseBranch: string, cwd?: string): string {
  return execGitSync(["diff", "--stat", `${baseBranch}...HEAD`], {
    cwd,
    silent: true,
  });
}
