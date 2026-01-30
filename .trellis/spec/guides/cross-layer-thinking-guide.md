# Cross-Layer Thinking Guide

> **Purpose**: Think through data flow across layers before implementing.

---

## The Problem

**Most bugs happen at layer boundaries**, not within layers.

Common cross-layer bugs:
- API returns format A, frontend expects format B
- Database stores X, service transforms to Y, but loses data
- Multiple layers implement the same logic differently

---

## Before Implementing Cross-Layer Features

### Step 1: Map the Data Flow

Draw out how data moves:

```
Source → Transform → Store → Retrieve → Transform → Display
```

For each arrow, ask:
- What format is the data in?
- What could go wrong?
- Who is responsible for validation?

### Step 2: Identify Boundaries

| Boundary | Common Issues |
|----------|---------------|
| API ↔ Service | Type mismatches, missing fields |
| Service ↔ Database | Format conversions, null handling |
| Backend ↔ Frontend | Serialization, date formats |
| Component ↔ Component | Props shape changes |

### Step 3: Define Contracts

For each boundary:
- What is the exact input format?
- What is the exact output format?
- What errors can occur?

---

## Common Cross-Layer Mistakes

### Mistake 1: Implicit Format Assumptions

**Bad**: Assuming date format without checking

**Good**: Explicit format conversion at boundaries

### Mistake 2: Scattered Validation

**Bad**: Validating the same thing in multiple layers

**Good**: Validate once at the entry point

### Mistake 3: Leaky Abstractions

**Bad**: Component knows about database schema

**Good**: Each layer only knows its neighbors

---

## Checklist for Cross-Layer Features

Before implementation:
- [ ] Mapped the complete data flow
- [ ] Identified all layer boundaries
- [ ] Defined format at each boundary
- [ ] Decided where validation happens

After implementation:
- [ ] Tested with edge cases (null, empty, invalid)
- [ ] Verified error handling at each boundary
- [ ] Checked data survives round-trip

---

## When to Create Flow Documentation

Create detailed flow docs when:
- Feature spans 3+ layers
- Multiple teams are involved
- Data format is complex
- Feature has caused bugs before

---

## CLI Module Boundaries (Trellis-Specific)

### Core Module Dependencies

```
commands/        → Uses →    core/*
     ↓
configurators/   → Uses →    core/paths, templates/

core/
├── paths.ts     ← Used by all modules (no dependencies)
├── task/        ← Uses: paths, developer, git
├── developer/   ← Uses: paths, git
├── git/         ← Uses: paths
├── session/     ← Uses: paths, developer, task
└── platforms/   ← Uses: paths, git
```

### Common CLI Boundary Issues

| Boundary | Common Issues | Prevention |
|----------|---------------|------------|
| Command → Core | Missing validation at entry | Validate with Zod at command level |
| Core → Filesystem | Path construction errors | Use centralized path functions |
| Core → Git (execa) | Error message extraction | Use ExecaError type guard |
| Template → Zod Schema | JSON format mismatch | Sync shell templates with Zod schemas |

### CLI Data Flow Example

```
User Input (trellis task create "My Task")
     ↓
Command Layer (commands/task.ts)
  - Parse CLI arguments
  - Validate with Zod schemas
     ↓
Core Layer (core/task/crud.ts)
  - Business logic
  - Uses execa for git commands
     ↓
Filesystem (task.json, context.jsonl)
  - Must match Zod schema exactly
     ↓
Read Back (core/task/crud.ts)
  - safeParse with Zod
  - Return typed data
```

### Template-Schema Sync Rule

**CRITICAL**: When bash scripts generate JSON (like `create-bootstrap.sh`), the JSON MUST match the TypeScript Zod schema:

```typescript
// If schema has:
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),        // ← Required
  current_phase: z.number(), // ← Required
});

// Shell script MUST generate:
cat > task.json << EOF
{
  "id": "$ID",
  "name": "$NAME",
  "title": "$TITLE",
  "current_phase": 0
}
EOF
```

**Common Mistake**: Adding new required fields to Zod schema without updating shell templates.

---

## CLI Module Checklist

Before implementing CLI features:

- [ ] Identified which core modules are involved
- [ ] Checked if data crosses core module boundaries
- [ ] Verified Zod schemas match any templates that generate data
- [ ] Decided where validation happens (command vs core)

After implementation:

- [ ] Tested with invalid input at each boundary
- [ ] Verified error messages are user-friendly
- [ ] Checked data survives write/read round-trip
