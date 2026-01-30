# Hooks 迁移 - Python to TypeScript

## 背景

本任务是 `01-30-multi-agent-pipeline-refactor` 的后续任务。

Pipeline 迁移时决定暂不迁移 hooks，保持 Python 实现。本任务将 hooks 迁移到 TypeScript，统一项目技术栈。

## 依赖

- **前置任务**: `01-30-multi-agent-pipeline-refactor` 必须先完成
- **依赖模块**: `core/pipeline/state.ts`, `core/task/`

## 待迁移的 Hooks

### 1. inject-subagent-context.py

**功能**：
- 拦截 `Task` tool 调用 (PreToolUse)
- 检测 `subagent_type` 参数 (implement, check, debug, research)
- 读取 `.trellis/.current-task` 获取任务目录
- 读取对应的 JSONL 文件 (implement.jsonl, check.jsonl, etc.)
- 加载所有引用的 spec 文件
- 将 context 注入到 subagent prompt
- 更新 task.json 的 `current_phase`

**复杂度**: 高 (核心 hook，逻辑复杂)

### 2. ralph-loop.py

**功能**：
- 控制 check agent 的完成条件 (Stop hook)
- 检查所有 completion markers 是否存在
- 或运行 `worktree.yaml` 中的 verify commands
- 最多 5 次迭代的安全限制

**复杂度**: 中

## 技术考量

### Claude Code Hooks TypeScript 支持

需要先确认 Claude Code hooks 是否支持 TypeScript：
- [ ] 查阅 Claude Code 文档
- [ ] 测试 `.ts` 或 `.js` hook 是否能运行
- [ ] 确认 hook 的输入/输出格式

### 共享 Zod Schemas

迁移后的 hooks 可以复用 `core/pipeline/schemas.ts` 中的类型定义：

```typescript
// hooks 可以 import 共享类型
import { TaskSchema, AgentSchema } from '../../src/core/pipeline/schemas.js';
```

### 状态管理集成

迁移后的 hooks 可以调用 `core/pipeline/state.ts` 的函数，而不是直接操作文件：

```typescript
// 现在 (Python): 直接读写文件
// task_json = json.load(open(task_json_path))
// task_json['current_phase'] = new_phase
// json.dump(task_json, open(task_json_path, 'w'))

// 迁移后 (TypeScript): 调用 state 模块
import { setPhase, getCurrentTask } from '../../src/core/pipeline/state.js';
setPhase(taskDir, newPhase);
```

## 实施步骤

### Phase 1: 研究
- [ ] 确认 Claude Code hooks TypeScript 支持情况
- [ ] 分析现有 Python hooks 的完整逻辑
- [ ] 确定 hook 文件的组织方式

### Phase 2: inject-subagent-context
- [ ] 创建 `.claude/hooks/inject-subagent-context.ts`
- [ ] 实现 JSONL 文件读取逻辑
- [ ] 实现 spec 文件加载逻辑
- [ ] 实现 prompt 注入逻辑
- [ ] 集成 `core/pipeline/state.ts` 的 phase 管理

### Phase 3: ralph-loop
- [ ] 创建 `.claude/hooks/ralph-loop.ts`
- [ ] 实现 completion marker 检查
- [ ] 实现 verify command 执行
- [ ] 实现迭代限制逻辑

### Phase 4: 模板更新
- [ ] 更新 `src/templates/claude/hooks/`
- [ ] 确保新项目使用 TypeScript hooks

### Phase 5: 验证
- [ ] 测试 inject-subagent-context hook
- [ ] 测试 ralph-loop hook
- [ ] 完整 pipeline 端到端测试

### Phase 6: 清理
- [ ] 删除旧的 Python hooks
- [ ] 更新文档

## 验收标准

- [ ] 所有 hooks 使用 TypeScript 实现
- [ ] 功能与 Python 版本完全一致
- [ ] 复用 `core/pipeline/` 模块的类型和函数
- [ ] 端到端 pipeline 测试通过
- [ ] 模板已更新

## 范围外 (Out of Scope)

- **新 hook 功能**: 本次只迁移，不添加新功能
- **其他平台 hooks**: 只处理 Claude Code hooks

## 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Claude Code 不支持 TS hooks | 无法迁移 | 先研究确认，不支持则保持 Python |
| 行为不一致 | Pipeline 失败 | 充分测试，对比 Python 版本输出 |
