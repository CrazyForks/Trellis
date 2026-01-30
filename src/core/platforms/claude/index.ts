/**
 * Claude Code platform adapter
 *
 * Implements PlatformAdapter for Claude Code, providing:
 * - Context file generation (implement.jsonl, check.jsonl, debug.jsonl)
 * - Agent launching via `claude` CLI
 * - Log parsing for status monitoring
 */

import fs from "node:fs";
import path from "node:path";
import type { DevType, ContextEntry } from "../../../types/task.js";
import type {
  PlatformAdapter,
  LaunchAgentOptions,
  AgentProcess,
  AgentLogEntry,
} from "../types.js";
import { claudeContextGenerator } from "./context.js";

/**
 * Write JSONL entries to a file
 */
function writeJsonl(filePath: string, entries: ContextEntry[]): void {
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(filePath, content);
}

/**
 * Claude Code platform adapter
 */
export const claudeAdapter: PlatformAdapter = {
  platform: "claude",

  getConfigDir(): string {
    return ".claude";
  },

  supportsMultiAgent(): boolean {
    return true;
  },

  supportsHooks(): boolean {
    return true;
  },

  generateContextFiles(taskDir: string, devType: DevType): void {
    // Generate implement.jsonl
    const implementEntries = [...claudeContextGenerator.getImplementBase()];

    switch (devType) {
      case "backend":
      case "test":
        implementEntries.push(...claudeContextGenerator.getImplementBackend());
        break;
      case "frontend":
        implementEntries.push(...claudeContextGenerator.getImplementFrontend());
        break;
      case "fullstack":
        implementEntries.push(...claudeContextGenerator.getImplementBackend());
        implementEntries.push(...claudeContextGenerator.getImplementFrontend());
        break;
    }

    writeJsonl(path.join(taskDir, "implement.jsonl"), implementEntries);

    // Generate check.jsonl
    writeJsonl(
      path.join(taskDir, "check.jsonl"),
      claudeContextGenerator.getCheckContext(devType),
    );

    // Generate debug.jsonl
    writeJsonl(
      path.join(taskDir, "debug.jsonl"),
      claudeContextGenerator.getDebugContext(devType),
    );
  },

  async launchAgent(options: LaunchAgentOptions): Promise<AgentProcess> {
    // Import execa dynamically to avoid issues with ESM
    const { execa } = await import("execa");

    const agentFile =
      options.agentFile ??
      `.claude/agents/${options.agentType}.md`;

    const logFile = path.join(options.workDir, ".agent-log");

    // Build claude command arguments
    const args = ["--agent", agentFile];

    if (options.background) {
      // For background execution, we need to use nohup or similar
      // This is a simplified implementation - full implementation would
      // handle process management more robustly
      const subprocess = execa("claude", args, {
        cwd: options.workDir,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Write stdout to log file
      if (subprocess.stdout) {
        const logStream = fs.createWriteStream(logFile, { flags: "a" });
        subprocess.stdout.pipe(logStream);
      }

      subprocess.unref();

      return {
        pid: subprocess.pid ?? 0,
        logFile,
        sessionId: undefined,
      };
    } else {
      // Foreground execution
      const subprocess = execa("claude", args, {
        cwd: options.workDir,
        stdio: "inherit",
      });

      return {
        pid: subprocess.pid ?? 0,
        logFile,
      };
    }
  },

  parseAgentLog(line: string): AgentLogEntry | null {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;

      // Claude's JSON output format
      if (parsed.type === "tool_use" || parsed.type === "tool_result") {
        return {
          type: "tool_call",
          timestamp: new Date().toISOString(),
          content: parsed,
        };
      }

      if (parsed.type === "text") {
        return {
          type: "message",
          timestamp: new Date().toISOString(),
          content: parsed.text,
        };
      }

      if (parsed.type === "error") {
        return {
          type: "error",
          timestamp: new Date().toISOString(),
          content: parsed.message ?? parsed,
        };
      }

      return null;
    } catch {
      // Not JSON, might be plain text output
      return null;
    }
  },
};

// Re-export context generator for direct access if needed
export { claudeContextGenerator };
