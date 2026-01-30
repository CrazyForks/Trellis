/**
 * Git/Worktree configuration
 *
 * Parse and manage worktree.yaml configuration.
 */

import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { getRepoRoot } from "../paths.js";
import { PATHS } from "../../constants/paths.js";
import {
  type WorktreeConfig,
  WorktreeConfigSchema,
  DEFAULT_WORKTREE_CONFIG,
} from "./types.js";

/**
 * Get the path to worktree.yaml
 *
 * @param repoRoot - Repository root path
 * @returns Path to worktree.yaml
 */
export function getWorktreeConfigPath(repoRoot?: string): string {
  const root = repoRoot ?? getRepoRoot();
  return path.join(root, PATHS.WORKFLOW, "worktree.yaml");
}

/**
 * Load worktree configuration from worktree.yaml
 *
 * Returns default configuration if file doesn't exist or is invalid.
 *
 * @param repoRoot - Repository root path
 * @returns Worktree configuration
 */
export function loadWorktreeConfig(repoRoot?: string): WorktreeConfig {
  const configPath = getWorktreeConfigPath(repoRoot);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_WORKTREE_CONFIG;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content);
    const validated = WorktreeConfigSchema.safeParse(parsed);

    if (validated.success) {
      // Merge with defaults for any missing fields
      return {
        ...DEFAULT_WORKTREE_CONFIG,
        ...validated.data,
      };
    }

    console.warn(
      `Warning: Invalid worktree.yaml format, using defaults: ${validated.error.message}`,
    );
    return DEFAULT_WORKTREE_CONFIG;
  } catch {
    console.warn(`Warning: Failed to parse worktree.yaml, using defaults`);
    return DEFAULT_WORKTREE_CONFIG;
  }
}

/**
 * Save worktree configuration to worktree.yaml
 *
 * @param config - Configuration to save
 * @param repoRoot - Repository root path
 */
export function saveWorktreeConfig(
  config: WorktreeConfig,
  repoRoot?: string,
): void {
  const configPath = getWorktreeConfigPath(repoRoot);

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Convert to YAML with comments
  const content = `# Worktree configuration for Trellis multi-agent pipeline
#
# base_dir: Directory where worktrees are created (relative to repo root)
# copy_files: Files to copy from main repo to new worktrees
# post_create: Commands to run after creating a worktree

base_dir: ${config.base_dir ?? DEFAULT_WORKTREE_CONFIG.base_dir}

copy_files:
${(config.copy_files ?? DEFAULT_WORKTREE_CONFIG.copy_files ?? []).map((f) => `  - ${f}`).join("\n")}

post_create:
${(config.post_create ?? []).map((c) => `  - ${c}`).join("\n") || "  # - npm install"}
`;

  fs.writeFileSync(configPath, content);
}

/**
 * Check if worktree.yaml exists
 */
export function worktreeConfigExists(repoRoot?: string): boolean {
  const configPath = getWorktreeConfigPath(repoRoot);
  return fs.existsSync(configPath);
}

/**
 * Get the base directory for worktrees
 *
 * @param repoRoot - Repository root path
 * @returns Absolute path to worktree base directory
 */
export function getWorktreeBaseDir(repoRoot?: string): string {
  const root = repoRoot ?? getRepoRoot();
  const config = loadWorktreeConfig(root);
  const baseDir = config.base_dir ?? DEFAULT_WORKTREE_CONFIG.base_dir ?? "../.worktrees";
  return path.resolve(root, baseDir);
}

/**
 * Get the list of files to copy to new worktrees
 *
 * @param repoRoot - Repository root path
 * @returns Array of file paths to copy
 */
export function getWorktreeCopyFiles(repoRoot?: string): string[] {
  const config = loadWorktreeConfig(repoRoot);
  return config.copy_files ?? DEFAULT_WORKTREE_CONFIG.copy_files ?? [];
}

/**
 * Get the post-create hooks
 *
 * @param repoRoot - Repository root path
 * @returns Array of commands to run after creating a worktree
 */
export function getWorktreePostCreateHooks(repoRoot?: string): string[] {
  const config = loadWorktreeConfig(repoRoot);
  return config.post_create ?? [];
}
