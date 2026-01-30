# Shell Script Conventions

> Standards for multi-agent pipeline scripts in `.trellis/scripts/multi-agent/`.

---

## Overview

Most CLI functionality has migrated to TypeScript (`trellis` command). Shell scripts are only used for **multi-agent pipeline** orchestration, which requires shell-level process management.

For TypeScript CLI patterns, see [Quality Guidelines](./quality-guidelines.md).

---

## Directory Structure

```
.trellis/scripts/
├── common/               # Shared utilities (still used by multi-agent)
│   ├── paths.sh          # Path constants
│   ├── phase.sh          # Phase tracking
│   ├── registry.sh       # Agent registry
│   └── worktree.sh       # Git worktree utilities
├── multi-agent/          # Pipeline scripts
│   ├── start.sh          # Start pipeline
│   ├── status.sh         # Check status
│   ├── cleanup.sh        # Cleanup worktrees
│   └── create-pr.sh      # Create PR from worktree
└── add-session.sh        # Session recording (legacy)
```

---

## Multi-Agent Script Patterns

### Phase Tracking

```bash
source "$SCRIPT_DIR/common/phase.sh"

# Set current phase
set_phase "$TASK_DIR" 1

# Get current phase
current=$(get_phase "$TASK_DIR")

# Check if phase complete
if is_phase_complete "$TASK_DIR" 1; then
  set_phase "$TASK_DIR" 2
fi
```

### Agent Registry

```bash
source "$SCRIPT_DIR/common/registry.sh"

# Register agent
register_agent "$TASK_DIR" "implement" "$PID"

# Check agent status
if is_agent_running "$TASK_DIR" "implement"; then
  echo "Agent still running"
fi

# Cleanup on exit
cleanup_agent "$TASK_DIR" "implement"
```

### Worktree Management

```bash
source "$SCRIPT_DIR/common/worktree.sh"

# Create worktree for task
create_task_worktree "$TASK_DIR" "$BRANCH_NAME"

# Get worktree path
worktree_path=$(get_worktree_path "$TASK_DIR")

# Cleanup worktree
cleanup_worktree "$TASK_DIR"
```

---

## Output Conventions

| Stream | Usage |
|--------|-------|
| stdout | Data for scripting (paths, JSON) |
| stderr | User messages, errors |

```bash
# Data on stdout
echo "$WORKTREE_PATH"

# Messages on stderr
echo -e "${GREEN}Pipeline started${NC}" >&2
```

---

## Error Handling

```bash
set -e  # Exit on error

# Validate inputs
if [[ -z "$TASK_DIR" ]]; then
  echo -e "${RED}Error: Task directory required${NC}" >&2
  exit 1
fi

# Cleanup on exit
trap 'cleanup_agent "$TASK_DIR" "$$"' EXIT
```

---

## Migration Note

Core functionality has moved to TypeScript CLI:

| Old Shell | New CLI |
|-----------|---------|
| `task.sh create` | `trellis task create` |
| `task.sh list` | `trellis task list` |
| `init-developer.sh` | `trellis developer init` |
| `get-developer.sh` | `trellis developer get` |
| `get-context.sh` | `trellis context` |

For new features, prefer TypeScript CLI over shell scripts.
