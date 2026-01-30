/**
 * Platform adapter types for multi-IDE support
 */

import type { DevType, ContextEntry } from "../../types/task.js";

/**
 * Supported platforms
 */
export type Platform = "claude" | "opencode" | "cursor" | "codex";

/**
 * Options for launching an agent
 */
export interface LaunchAgentOptions {
  /** Agent type */
  agentType: "plan" | "dispatch";
  /** Working directory (worktree path) */
  workDir: string;
  /** Task directory path */
  taskDir: string;
  /** Custom agent file path */
  agentFile?: string;
  /** Run in background */
  background?: boolean;
}

/**
 * Agent process information
 */
export interface AgentProcess {
  /** Process ID */
  pid: number;
  /** Log file path */
  logFile: string;
  /** Session ID (if available) */
  sessionId?: string;
}

/**
 * Agent log entry
 */
export interface AgentLogEntry {
  /** Entry type */
  type: "tool_call" | "message" | "error" | "complete";
  /** Timestamp */
  timestamp: string;
  /** Entry content */
  content: unknown;
}

/**
 * Platform adapter interface
 *
 * Each platform (Claude Code, OpenCode, Cursor, etc.) implements this interface
 * to provide platform-specific functionality.
 */
export interface PlatformAdapter {
  /** Platform identifier */
  readonly platform: Platform;

  // === Context Generation ===

  /**
   * Generate context files for a task (e.g., implement.jsonl, check.jsonl)
   */
  generateContextFiles(taskDir: string, devType: DevType): void;

  /**
   * Get the platform's config directory name
   * @returns Directory name (e.g., ".claude", ".opencode")
   */
  getConfigDir(): string;

  // === Capability Detection ===

  /**
   * Check if the platform supports multi-agent pipeline
   */
  supportsMultiAgent(): boolean;

  /**
   * Check if the platform supports hooks
   */
  supportsHooks(): boolean;

  // === Agent Launching (for multi-agent pipeline) ===

  /**
   * Launch an agent
   * @throws Error if platform doesn't support multi-agent
   */
  launchAgent(options: LaunchAgentOptions): Promise<AgentProcess>;

  /**
   * Parse a line from agent log
   * @returns Parsed entry or null if line is not parseable
   */
  parseAgentLog(line: string): AgentLogEntry | null;
}

/**
 * Context generator interface for generating context entries
 */
export interface ContextGenerator {
  /**
   * Get base implement context entries
   */
  getImplementBase(): ContextEntry[];

  /**
   * Get backend implement context entries
   */
  getImplementBackend(): ContextEntry[];

  /**
   * Get frontend implement context entries
   */
  getImplementFrontend(): ContextEntry[];

  /**
   * Get check context entries
   */
  getCheckContext(devType: DevType): ContextEntry[];

  /**
   * Get debug context entries
   */
  getDebugContext(devType: DevType): ContextEntry[];
}
