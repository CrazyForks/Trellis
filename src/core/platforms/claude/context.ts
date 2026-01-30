/**
 * Claude Code context generation
 *
 * Generates context entries (implement.jsonl, check.jsonl, debug.jsonl)
 * for Claude Code's hook-based context injection system.
 */

import type { DevType, ContextEntry } from "../../../types/task.js";
import type { ContextGenerator } from "../types.js";
import { PATHS } from "../../../constants/paths.js";

/**
 * Claude Code context generator
 */
export const claudeContextGenerator: ContextGenerator = {
  /**
   * Get base implement context entries
   */
  getImplementBase(): ContextEntry[] {
    return [
      {
        file: `${PATHS.WORKFLOW}/workflow.md`,
        reason: "Project workflow and conventions",
      },
      {
        file: `${PATHS.SPEC}/shared/index.md`,
        reason: "Shared coding standards",
      },
    ];
  },

  /**
   * Get backend implement context entries
   */
  getImplementBackend(): ContextEntry[] {
    return [
      {
        file: `${PATHS.SPEC}/backend/index.md`,
        reason: "Backend development guide",
      },
      {
        file: `${PATHS.SPEC}/backend/api-module.md`,
        reason: "API module conventions",
      },
      {
        file: `${PATHS.SPEC}/backend/quality.md`,
        reason: "Code quality requirements",
      },
    ];
  },

  /**
   * Get frontend implement context entries
   */
  getImplementFrontend(): ContextEntry[] {
    return [
      {
        file: `${PATHS.SPEC}/frontend/index.md`,
        reason: "Frontend development guide",
      },
      {
        file: `${PATHS.SPEC}/frontend/components.md`,
        reason: "Component conventions",
      },
    ];
  },

  /**
   * Get check context entries
   */
  getCheckContext(devType: DevType): ContextEntry[] {
    const entries: ContextEntry[] = [
      {
        file: ".claude/commands/trellis/finish-work.md",
        reason: "Finish work checklist",
      },
      {
        file: `${PATHS.SPEC}/shared/index.md`,
        reason: "Shared coding standards",
      },
    ];

    if (devType === "backend" || devType === "fullstack") {
      entries.push({
        file: ".claude/commands/trellis/check-backend.md",
        reason: "Backend check spec",
      });
    }

    if (devType === "frontend" || devType === "fullstack") {
      entries.push({
        file: ".claude/commands/trellis/check-frontend.md",
        reason: "Frontend check spec",
      });
    }

    return entries;
  },

  /**
   * Get debug context entries
   */
  getDebugContext(devType: DevType): ContextEntry[] {
    const entries: ContextEntry[] = [
      {
        file: `${PATHS.SPEC}/shared/index.md`,
        reason: "Shared coding standards",
      },
    ];

    if (devType === "backend" || devType === "fullstack") {
      entries.push({
        file: ".claude/commands/trellis/check-backend.md",
        reason: "Backend check spec",
      });
    }

    if (devType === "frontend" || devType === "fullstack") {
      entries.push({
        file: ".claude/commands/trellis/check-frontend.md",
        reason: "Frontend check spec",
      });
    }

    return entries;
  },
};
