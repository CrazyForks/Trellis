/**
 * Developer schemas with Zod validation
 */

import { z } from "zod";

/**
 * Developer identity stored in .developer file
 */
export const DeveloperSchema = z.object({
  /** Developer name */
  name: z.string().min(1),
  /** Initialization timestamp */
  initialized_at: z.string(),
});

export type Developer = z.infer<typeof DeveloperSchema>;

/**
 * Developer info for display
 */
export const DeveloperInfoSchema = z.object({
  /** Developer name */
  name: z.string().nullable(),
  /** Workspace directory path */
  workspacePath: z.string().nullable(),
  /** Active journal file path */
  journalFile: z.string().nullable(),
  /** Number of lines in journal file */
  journalLines: z.number(),
});

export type DeveloperInfo = z.infer<typeof DeveloperInfoSchema>;

/**
 * Parse developer identity
 */
export function parseDeveloper(content: unknown): Developer {
  return DeveloperSchema.parse(content);
}

/**
 * Safely parse developer identity
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function safeParseDeveloper(content: unknown) {
  return DeveloperSchema.safeParse(content);
}
