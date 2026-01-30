/**
 * Task CRUD operations
 *
 * Create, Read, Update, Delete (archive) operations for tasks.
 */

import fs from "node:fs";
import path from "node:path";
import {
  getRepoRoot,
  getTasksDir,
  getArchiveDir,
  getTaskDir,
  getCurrentTask,
  clearCurrentTask,
  ensureTasksDir,
  generateTaskDatePrefix,
  slugify,
} from "../paths.js";
import { getDeveloper } from "../developer/index.js";
import { PATHS, DIR_NAMES, FILE_NAMES } from "../../constants/paths.js";
import {
  type Task,
  type CreateTaskOptions,
  type ListTasksOptions,
  TaskSchema,
  DEFAULT_PHASES,
} from "./schemas.js";

/**
 * Read task.json from a task directory
 *
 * @param taskDir - Absolute path to task directory
 * @returns Task object or null if not found/invalid
 */
export function readTask(taskDir: string): Task | null {
  const taskJsonPath = path.join(taskDir, FILE_NAMES.TASK_JSON);

  if (!fs.existsSync(taskJsonPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(taskJsonPath, "utf-8");
    const parsed = TaskSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      console.warn(`Invalid task.json in ${taskDir}: ${parsed.error.message}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Write task.json to a task directory
 *
 * @param taskDir - Absolute path to task directory
 * @param task - Task object to write
 */
export function writeTask(taskDir: string, task: Task): void {
  const taskJsonPath = path.join(taskDir, FILE_NAMES.TASK_JSON);
  fs.writeFileSync(taskJsonPath, JSON.stringify(task, null, 2) + "\n");
}

/**
 * Create a new task
 *
 * @param title - Task title
 * @param options - Creation options
 * @param repoRoot - Repository root path
 * @returns Relative path to the task directory
 */
export function createTask(
  title: string,
  options: CreateTaskOptions = {},
  repoRoot?: string,
): string {
  const root = repoRoot ?? getRepoRoot();

  // Get or validate assignee
  let assignee: string;
  if (options.assignee) {
    assignee = options.assignee;
  } else {
    const currentDeveloper = getDeveloper(root);
    if (!currentDeveloper) {
      throw new Error(
        "No developer set. Run 'trellis init -u <name>' first or use --assignee",
      );
    }
    assignee = currentDeveloper;
  }

  // Get creator (same as current developer or assignee)
  const creator = getDeveloper(root) ?? assignee;

  // Generate slug
  const slug = options.slug ?? slugify(title);
  if (!slug) {
    throw new Error("Could not generate slug from title");
  }

  // Ensure tasks directory exists
  ensureTasksDir(root);

  // Create task directory with MM-DD-slug format
  const datePrefix = generateTaskDatePrefix();
  const dirName = `${datePrefix}-${slug}`;
  const taskDir = getTaskDir(dirName, root);

  if (fs.existsSync(taskDir)) {
    console.warn(`Warning: Task directory already exists: ${dirName}`);
  } else {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  // Create task.json
  const today = new Date().toISOString().split("T")[0];
  const task: Task = {
    id: slug,
    name: slug,
    title,
    description: options.description ?? "",
    status: "planning",
    dev_type: null,
    scope: null,
    priority: options.priority ?? "P2",
    creator,
    assignee,
    createdAt: today,
    completedAt: null,
    branch: null,
    base_branch: null,
    worktree_path: null,
    current_phase: 0,
    next_action: DEFAULT_PHASES,
    commit: null,
    pr_url: null,
    subtasks: [],
    relatedFiles: [],
    notes: "",
  };

  writeTask(taskDir, task);

  // Return relative path
  return `${PATHS.TASKS}/${dirName}`;
}

/**
 * Find a task by name (partial match)
 *
 * @param nameOrSlug - Task name, slug, or directory name to search for
 * @param repoRoot - Repository root path
 * @returns Task and directory path, or null if not found
 */
export function findTask(
  nameOrSlug: string,
  repoRoot?: string,
): { task: Task; dir: string } | null {
  const tasksDir = getTasksDir(repoRoot);

  if (!fs.existsSync(tasksDir)) {
    return null;
  }

  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === DIR_NAMES.ARCHIVE) {
      continue;
    }

    const taskDir = path.join(tasksDir, entry.name);
    const task = readTask(taskDir);

    if (task) {
      // Match by directory name, id, or name
      if (
        entry.name === nameOrSlug ||
        entry.name.endsWith(`-${nameOrSlug}`) ||
        task.id === nameOrSlug ||
        task.name === nameOrSlug
      ) {
        return { task, dir: taskDir };
      }
    }
  }

  return null;
}

/**
 * List all active tasks
 *
 * @param options - Filter options
 * @param repoRoot - Repository root path
 * @returns Array of tasks with metadata
 */
export function listTasks(
  options: ListTasksOptions = {},
  repoRoot?: string,
): { task: Task; dirName: string; isCurrent: boolean }[] {
  const root = repoRoot ?? getRepoRoot();
  const tasksDir = getTasksDir(root);
  const currentTaskPath = getCurrentTask(root);
  const developer = getDeveloper(root);

  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  const results: { task: Task; dirName: string; isCurrent: boolean }[] = [];
  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === DIR_NAMES.ARCHIVE) {
      continue;
    }

    const taskDir = path.join(tasksDir, entry.name);
    const task = readTask(taskDir);

    if (!task) {
      continue;
    }

    // Apply filters
    if (options.mine && task.assignee !== developer) {
      continue;
    }

    if (options.status && task.status !== options.status) {
      continue;
    }

    const relativePath = `${PATHS.TASKS}/${entry.name}`;
    results.push({
      task,
      dirName: entry.name,
      isCurrent: relativePath === currentTaskPath,
    });
  }

  return results;
}

/**
 * Update a task
 *
 * @param taskDir - Absolute path to task directory
 * @param updates - Partial task updates
 * @returns Updated task or null if not found
 */
export function updateTask(
  taskDir: string,
  updates: Partial<Task>,
): Task | null {
  const task = readTask(taskDir);

  if (!task) {
    return null;
  }

  const updatedTask = { ...task, ...updates };
  writeTask(taskDir, updatedTask);

  return updatedTask;
}

/**
 * Archive a task
 *
 * @param nameOrSlug - Task name or slug to archive
 * @param repoRoot - Repository root path
 * @returns New archive path or null if not found
 */
export function archiveTask(
  nameOrSlug: string,
  repoRoot?: string,
): string | null {
  const root = repoRoot ?? getRepoRoot();
  const found = findTask(nameOrSlug, root);

  if (!found) {
    return null;
  }

  const { dir: taskDir } = found;
  const dirName = path.basename(taskDir);

  // Update status before archiving
  const today = new Date().toISOString().split("T")[0];
  updateTask(taskDir, {
    status: "completed",
    completedAt: today,
  });

  // Clear if it's the current task
  const currentTaskPath = getCurrentTask(root);
  if (currentTaskPath?.includes(dirName)) {
    clearCurrentTask(root);
  }

  // Move to archive
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const archiveMonthDir = path.join(getArchiveDir(root), yearMonth);

  if (!fs.existsSync(archiveMonthDir)) {
    fs.mkdirSync(archiveMonthDir, { recursive: true });
  }

  const archivePath = path.join(archiveMonthDir, dirName);
  fs.renameSync(taskDir, archivePath);

  return `${PATHS.TASKS}/${DIR_NAMES.ARCHIVE}/${yearMonth}/${dirName}`;
}

/**
 * List archived tasks
 *
 * @param month - Optional month filter (YYYY-MM format)
 * @param repoRoot - Repository root path
 * @returns Array of archived task info
 */
export function listArchivedTasks(
  month?: string,
  repoRoot?: string,
): { dirName: string; month: string }[] {
  const archiveDir = getArchiveDir(repoRoot);

  if (!fs.existsSync(archiveDir)) {
    return [];
  }

  const results: { dirName: string; month: string }[] = [];

  if (month) {
    // List tasks for specific month
    const monthDir = path.join(archiveDir, month);
    if (fs.existsSync(monthDir)) {
      const entries = fs.readdirSync(monthDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          results.push({ dirName: entry.name, month });
        }
      }
    }
  } else {
    // List all archived months with tasks
    const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const monthDir = path.join(archiveDir, entry.name);
        const tasks = fs.readdirSync(monthDir, { withFileTypes: true });
        for (const task of tasks) {
          if (task.isDirectory()) {
            results.push({ dirName: task.name, month: entry.name });
          }
        }
      }
    }
  }

  return results;
}
