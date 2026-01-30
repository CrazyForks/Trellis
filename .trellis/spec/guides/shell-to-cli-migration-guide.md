# Shell to CLI Migration Guide

> **Purpose**: Document lessons learned and pitfalls encountered during shell script to TypeScript CLI migration.

---

## Background

The project is progressively migrating from `.trellis/scripts/*.sh` to TypeScript CLI (`trellis` command). This guide documents problems discovered and solutions applied during the migration.

---

## Pitfalls Encountered

### Pitfall 1: Zod v4 Does Not Export SafeParseReturnType

**Problem**: Attempting to explicitly type safeParse return causes error

```typescript
// Error: Module '"zod"' has no exported member 'SafeParseReturnType'
import { z, SafeParseReturnType } from "zod";

function safeParseTask(data: unknown): z.SafeParseReturnType<Task> {
  return TaskSchema.safeParse(data);
}
```

**Solution**: Let TypeScript infer the return type, add eslint-disable

```typescript
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function safeParseTask(content: unknown) {
  return TaskSchema.safeParse(content);
}
```

**Lesson**: Zod v4 API differs from v3. Don't assume v3 type exports exist in v4.

---

### Pitfall 2: Shell Template JSON Doesn't Match Zod Schema

**Problem**: `create-bootstrap.sh` generates `task.json` missing fields, Zod validation fails

```bash
# Shell script generates JSON with only some fields
cat > task.json << EOF
{
  "id": "$ID",
  "name": "$NAME",
  "status": "planning"
}
EOF
```

```typescript
// TypeScript Zod schema requires more fields
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),           // ← Shell didn't generate this
  current_phase: z.number(),   // ← Shell didn't generate this
  // ...
});
```

**Solution**: Update all shell scripts that generate JSON to match Zod schema exactly.

**Lessons**:
1. Define Zod schema first, then write shell templates
2. After adding Zod validation, search for all places generating that JSON and update
3. During migration when shell and TypeScript coexist, schema is the single source of truth

---

### Pitfall 3: ESLint Forbids require() But child_process Needs Import

**Problem**: Using `const { execSync } = require("child_process")` causes error

```
error  A `require()` style import is forbidden
```

**Solution**: Use ES module import

```typescript
import { execSync } from "node:child_process";
```

**Lesson**: Project is ES module (`"type": "module"`), all imports must use ES syntax.

---

### Pitfall 4: Optional Chaining Type Narrowing

**Problem**: `if (match && match[1])` ESLint requires optional chaining

```typescript
// ESLint requires this
if (match?.[1]) {
  name = match[1];  // ← TypeScript not sure if match exists here
}
```

**Solution**: Re-check in the conditional block or use clear type guard

```typescript
const match = content.match(/^name=(.+)$/m);
if (match?.[1]) {
  const name = match[1];  // OK, match definitely exists in this scope
}
```

---

### Pitfall 5: execa stderr Type Access

**Problem**: When catching execa errors, cannot directly access `error.stderr`

```typescript
catch (error) {
  console.error(error.stderr);  // ← TypeScript: Property 'stderr' does not exist
}
```

**Solution**: Use type guard

```typescript
import { execa, ExecaError } from "execa";

catch (error) {
  if (error instanceof Error && "stderr" in error) {
    const execaError = error as ExecaError;
    console.error(execaError.stderr);
  }
}
```

---

## Migration Decision Records

### Decision 1: Organize core/ Modules by Business Domain

**Choice**: Organize by business domain (task/, git/, developer/) instead of I/O separation (adapters/, services/)

**Reasons**:
- CLI tools don't need complex dependency injection
- Domain organization is more intuitive, files easier to find
- Each domain can self-contain schema + CRUD + utility functions

```
// Adopted structure
core/
├── task/       # All task-related code
├── git/        # All git-related code
└── developer/  # All developer-related code

// Rejected structure
core/
├── adapters/   # I/O adapters
├── services/   # Business logic
└── types/      # Type definitions
```

---

### Decision 2: Keep Shell Scripts as Fallback

**Choice**: TypeScript CLI and shell scripts coexist

**Reasons**:
- Multi-agent pipeline currently depends on shell scripts
- Progressive migration, not replacing everything at once
- Shell scripts are simpler in some scenarios (e.g., hook scripts)

---

### Decision 3: Zod Schema is Single Source of Truth

**Choice**: Types inferred from Zod schema (`z.infer<typeof Schema>`)

**Reasons**:
- Runtime validation and TypeScript types stay consistent
- Avoid type definitions and validation logic drifting apart
- External data (JSON files) must go through safeParse

---

## Migration Checklist

When migrating a shell feature to TypeScript:

- [ ] Identify which core/ domain the feature belongs to
- [ ] Define Zod schema (if data structures involved)
- [ ] Use `z.infer<>` to derive types, don't manually write interface
- [ ] Use execa to replace shell command calls
- [ ] Update all shell scripts generating that data to match schema
- [ ] Actually test CLI commands in testDir
- [ ] Update spec/backend/ guidelines if new patterns emerge

---

## Related Guidelines

- [Quality Guidelines](../backend/quality-guidelines.md) - Specific usage of Zod, execa, Platform Adapter
- [Directory Structure](../backend/directory-structure.md) - core/ module organization
- [Shell Conventions](../backend/shell-conventions.md) - Shell to CLI function mapping table
