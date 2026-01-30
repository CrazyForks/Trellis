/**
 * Session schemas with Zod validation
 */

import { z } from "zod";

/**
 * Session entry for journal
 */
export const SessionSchema = z.object({
  /** Session title */
  title: z.string().min(1),
  /** Commit hash(es) */
  commit: z.string().optional(),
  /** Brief summary */
  summary: z.string().optional(),
  /** Detailed content (markdown) */
  content: z.string().optional(),
  /** Session timestamp */
  timestamp: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Journal file information
 */
export const JournalInfoSchema = z.object({
  /** Absolute path to journal file */
  filePath: z.string(),
  /** Relative path from repo root */
  relativePath: z.string(),
  /** Number of lines */
  lineCount: z.number(),
  /** Journal file number (1, 2, 3, ...) */
  fileNumber: z.number(),
  /** Total session count across all files */
  sessionCount: z.number(),
});

export type JournalInfo = z.infer<typeof JournalInfoSchema>;

/**
 * Maximum lines per journal file before rotation
 */
export const MAX_JOURNAL_LINES = 2000;

/**
 * Parse session
 */
export function parseSession(content: unknown): Session {
  return SessionSchema.parse(content);
}

/**
 * Safely parse session
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function safeParseSession(content: unknown) {
  return SessionSchema.safeParse(content);
}
