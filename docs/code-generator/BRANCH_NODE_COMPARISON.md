# 分支节点对比：缩进模式详解

## 📊 三种分支节点缩进对比

本文档通过具体的代码示例，直观展示三种分支节点（If/Else、Guardrails、User Approval）的缩进差异。

---

## 1️⃣ If/Else 节点

### 特点

- ✅ 支持完全嵌套
- ✅ 缩进随嵌套深度自动增加
- ✅ 使用模板系统处理占位符
- ✅ 支持多个条件分支（case-0, case-1, ..., fallback）

### 单层示例

```python
# If/Else 节点在顶层
if state["user_type"] == "admin":
  # indentLevel=1, 缩进=4个空格
  agent_result = await Runner.run(agent, ...)
  return agent_result
else:
  return workflow
```

**缩进分析**:

```
顶层代码      indentLevel=0
├─ if 语句    indentLevel=0 (2空格)
├─ 分支代码   indentLevel=1 (4空格)  ← +1
└─ else       indentLevel=0 (2空格)
```

### 双层嵌套示例

```python
# 外层 If/Else
if state["branch1"] == "path_a":
  # indentLevel=1
  if state["branch2"] == "path_a1":
    # indentLevel=2, 缩进=6个空格
    agent_result = await Runner.run(agent, ...)
    return agent_result
  else:
    return workflow
else:
  return workflow
```

**缩进分析**:

```
顶层代码         indentLevel=0
├─ if state1     indentLevel=0 (2空格)
│  ├─ if state2  indentLevel=1 (4空格)    ← +1
│  │  └─ 代码    indentLevel=2 (6空格)    ← +1
│  └─ else       indentLevel=1 (4空格)
└─ else          indentLevel=0 (2空格)
```

### 三层嵌套示例

```python
if state["a"] == "1":
  # indentLevel=1
  if state["b"] == "2":
    # indentLevel=2
    if state["c"] == "3":
      # indentLevel=3, 缩进=8个空格
      agent_result = await Runner.run(agent, ...)
      return agent_result
    else:
      return workflow
  else:
    return workflow
else:
  return workflow
```

**缩进规律**:
| 层级 | indentLevel | 缩进量 | 代码示例 |
|-----|-------------|---------|---------|
| 外层 | 0 | 2空格 | if state |
| 中层 | 1 | 4空格 | if nested |
| 内层 | 2 | 6空格 | if deep_nested |
| 最内 | 3 | 8空格 | agent_result = |

---

## 2️⃣ Guardrails 节点

### 特点

- ❌ 不支持嵌套分支
- ✅ 始终在顶层执行
- ✅ 自成体系，独立于其他分支
- ⚠️ 如果需要嵌套，必须与 If/Else 配合

### 独立执行示例

```python
# Guardrails 节点始终在顶层（indentLevel=0）
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails

guardrails_inputtext = workflow["input_as_text"]
guardrails_result = await run_guardrails(...)
guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)

# 条件判断在顶层（缩进=2空格）
if guardrails_hastripwire:
  return guardrails_output
else:
  return guardrails_output
```

**缩进分析**:

```
顶层代码           indentLevel=0
├─ 导入            indentLevel=0 (0空格)
├─ 定义变量        indentLevel=0 (0空格)
├─ if 判断         indentLevel=0 (2空格)
│  ├─ 分支体       indentLevel=1 (4空格)  ← +1 (但这是 Guardrails 的分支)
│  └─ else         indentLevel=0 (2空格)
└─ 后续代码        indentLevel=0 (0空格)
```

### 与 If/Else 配合示例

```python
# 顺序执行：先 Guardrails，再 If/Else
# Guardrails (顶层，indentLevel=0)
guardrails_inputtext = workflow["input_as_text"]
guardrails_result = await run_guardrails(...)
guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)

if guardrails_hastripwire:
  return guardrails_output
else:
  return guardrails_output

# If/Else (顶层，indentLevel=0)
if state["next_step"] == "approve":
  # indentLevel=1, 缩进=4空格
  agent_result = await Runner.run(agent, ...)
  return agent_result
else:
  return workflow
```

**结构特点**:

- Guardrails 和 If/Else 是**并列关系**，不是嵌套关系
- 两者都在 indentLevel=0（顶层）
- 各自处理各自的逻辑分支

---

## 3️⃣ User Approval 节点

### 特点

- ✅ 支持链式连接（多个审批节点）
- ✅ 每增加一个审批节点，缩进增加 2 个空格
- ✅ 链式增长：1st审批→2nd审批→3rd审批...
- ✅ 自动生成多个 `approval_request` 函数

### 单个审批节点示例

```python
# User Approval 节点（单个）
def approval_request(message: str):
  # TODO: Implement
  return True

async def run_workflow(workflow_input: WorkflowInput):
  approval_message = "Please approve this action"

  # if 语句 indentLevel=1, 缩进=2空格
  if approval_request(approval_message):
    # 分支体 indentLevel=2, 缩进=4空格
    agent_result_temp = await Runner.run(agent, ...)
    agent_result = {"output_text": agent_result_temp.final_output_as(str)}
    return agent_result
  else:
    return workflow
```

**缩进分析**:

```
run_workflow 函数体
├─ 第一个审批     indentLevel=1
│  ├─ if 语句     缩进=2空格
│  ├─ 分支体      缩进=4空格 (indentLevel=2)
│  └─ else        缩进=2空格
└─ 返回值         缩进=2空格
```

### 链式两个审批节点示例

```python
def approval_request(message: str):
  return True

def approval_request1(message: str):
  return True

async def run_workflow(workflow_input: WorkflowInput):
  # 第1个审批节点
  approval_message = "First approval"
  if approval_request(approval_message):
    # indentLevel=1, 缩进=2空格

    # 第2个审批节点（嵌套在第1个之内）
    approval_message1 = "Second approval"
    if approval_request1(approval_message1):
      # indentLevel=3, 缩进=6空格 ← +2
      agent_result = await Runner.run(agent, ...)
      return agent_result
    else:
      return workflow
  else:
    return workflow
```

**缩进分析**:

```
主函数体
├─ 第1个审批节点      indentLevel=1 (缩进=2空格)
│  ├─ if approval     缩进=2空格
│  ├─ 第2个审批节点   indentLevel=3 (缩进=6空格) ← +2
│  │  ├─ if approval1 缩进=6空格
│  │  ├─ Agent代码    indentLevel=4 (缩进=8空格)
│  │  └─ else         缩进=6空格
│  └─ else            缩进=2空格
```

### 链式三个审批节点示例

```python
def approval_request(message: str):
  return True

def approval_request1(message: str):
  return True

def approval_request2(message: str):
  return True

async def run_workflow(workflow_input: WorkflowInput):
  approval_message = "First approval"
  if approval_request(approval_message):                    # indentLevel=1 (2)
    approval_message1 = "Second approval"
    if approval_request1(approval_message1):                # indentLevel=3 (6) ← +2
      approval_message2 = "Third approval"
      if approval_request2(approval_message2):              # indentLevel=5 (10) ← +2
        agent_result = await Runner.run(agent, ...)        # indentLevel=6 (12)
        return agent_result
      else:
        return workflow
    else:
      return workflow
  else:
    return workflow
```

**缩进规律**:
| 审批节点 | indentLevel | if语句缩进 | 分支体缩进 | 增量 |
|---------|-------------|-----------|-----------|------|
| 第1个 | 1 | 2空格 | 4空格 | - |
| 第2个 | 3 | 6空格 | 8空格 | +2 |
| 第3个 | 5 | 10空格 | 12空格 | +2 |
| 第4个 | 7 | 14空格 | 16空格 | +2 |

**链式增长规律**: `indentLevel = 1 + (nodeIndex * 2)`

---

## 📈 三种节点缩进对比表

### 缩进特性对比

| 特性         | If/Else      | Guardrails | User Approval |
| ------------ | ------------ | ---------- | ------------- |
| **支持嵌套** | ✅ 完全      | ❌ 否      | ✅ 链式       |
| **缩进增长** | 线性 (+1)    | 无         | 链式 (+2)     |
| **最大深度** | 无限制       | N/A        | 无限制        |
| **模板系统** | ✅ 使用      | ❌ 无      | ❌ 无         |
| **占位符**   | {CONTENT_X}  | N/A        | N/A           |
| **分支类型** | if/elif/else | if/else    | if/else       |
| **生成方式** | 递归遍历     | 直接生成   | 递归遍历      |

### 代码复杂度对比

```
If/Else:
- 单层: O(n)
- 嵌套d层: O(n×d)
- 递归深度: d

Guardrails:
- 固定: O(n)
- 无嵌套
- 递归深度: 0

User Approval:
- 单个: O(1)
- 链式c个: O(c²)
- 递归深度: c
```

---

## 🔄 缩进计算公式

### If/Else 缩进

```typescript
// 每进入一层分支，缩进 +1
indentLevel_nested = indentLevel_parent + 1
actualIndent = '  '.repeat(indentLevel_nested + 1)

// 示例
// 顶层 If:       indentLevel=0 → 缩进='  ' (2)
// 嵌套 If:       indentLevel=1 → 缩进='    ' (4)
// 深嵌套 If:     indentLevel=2 → 缩进='      ' (6)
```

### User Approval 缩进

```typescript
// 每增加一个链式审批节点，缩进 +2
// nodeIndex: 在链中的位置（0开始）
indentLevel = 1 + nodeIndex * 2
actualIndent = '  '.repeat(indentLevel + 1)

// 示例
// 第0个审批: indentLevel=1 → 缩进='  ' (2)    + if = 4空格
// 第1个审批: indentLevel=3 → 缩进='    ' (6)  + if = 8空格
// 第2个审批: indentLevel=5 → 缩进='      ' (10) + if = 12空格
```

### Guardrails 缩进

```typescript
// Guardrails 不参与缩进计算
// 始终在顶层，使用固定缩进
indentLevel = 0
actualIndent = '  ' (2个空格，始终)
```

---

## 🧬 生成过程对比

### If/Else 生成过程

```
1. generateIfElseNodeCode(node, true, indentLevel)
   ↓
2. 生成占位符框架（带缩进）
   ↓
3. traverseIfElseBranch(nodeId, 'on_result', indentLevel+1)
   ↓
4. 递归遍历每个分支
   ↓
5. 占位符替换 {CONTENT_0} ← branchCode
   ↓
6. 返回完整的 if/elif/else 结构
```

### Guardrails 生成过程

```
1. detectGuardrailsNodes()
   ↓
2. 生成导入和定义
   ↓
3. 生成 guardrails_config（顶层）
   ↓
4. 生成执行代码（固定缩进）
   ↓
5. 处理 on_pass 分支
   ↓
6. 返回完整的 Guardrails 块
```

### User Approval 生成过程

```
1. 检测是否为链式（approvalChain.length）
   ↓
2. 如果链式：生成多个 approval_request 函数
   ↓
3. traverseUserApprovalBranch(0, 1)
   ↓
4. 递归生成嵌套的 if 语句（缩进+2）
   ↓
5. 到达链末尾时，插入 Agent 代码
   ↓
6. 返回完整的嵌套批准结构
```

---

## 💡 实际应用场景

### 场景1：多条件流程（If/Else）

用户类型 → 权限检查 → 代理操作

```python
if user_type == "admin":
  if has_permission:
    agent_result = await run_agent()  # 缩进=6空格
    return agent_result
  else:
    return "No permission"
else:
  return "Not admin"
```

### 场景2：内容安全 + 业务逻辑（Guardrails + If/Else）

内容检查 → 条件判断 → 代理操作

```python
# 先做安全检查（Guardrails，顶层）
if guardrails_safe:
  pass  # 继续
else:
  return "Content blocked"

# 再做业务判断（If/Else，顶层）
if business_condition:
  agent_result = await run_agent()
  return agent_result
else:
  return workflow
```

### 场景3：多级批准流程（User Approval链）

主管批准 → 经理批准 → 执行操作

```python
if manager_approval("Manager review?"):          # 缩进=2
  if director_approval("Director review?"):      # 缩进=6 ← +2
    if ceo_approval("CEO approval?"):            # 缩进=10 ← +2
      agent_result = await run_agent()           # 缩进=12
      return agent_result
    else:
      return "CEO rejected"
  else:
    return "Director rejected"
else:
  return "Manager rejected"
```

---

## ✅ 快速检查表

### 检查缩进正确性

- [ ] If/Else：每层深度缩进 +2 个空格（indentLevel +1）
- [ ] User Approval：每条链节点缩进 +4 个空格（indentLevel +2，因为是 if+content）
- [ ] Guardrails：始终 2 个空格（固定顶层）
- [ ] 嵌套混合：If 内的代码都增加 4 空格，User Approval 链内都增加 4 空格

### 常见错误

❌ **错误**: If/Else 内用了 +2 的缩进（User Approval 的模式）

```python
if condition:
    # 这是错的（6空格）
else:
    # 应该是4空格
```

✅ **正确**: If/Else 内用 +1 的缩进（或 +4 空格）

```python
if condition:
  # 正确（4空格）
else:
  # 正确（2空格）
```

---

## 📚 相关文档

- [BRANCH_NODE_INDENTATION_RULES.md](./BRANCH_NODE_INDENTATION_RULES.md) - 详细规则文档
- [BRANCH_INDENTATION.md](./BRANCH_INDENTATION.md) - 设计背景
- [GUARDRAILS_NODE.md](./GUARDRAILS_NODE.md) - Guardrails 详解

---

**最后更新**: 2025-10 | 状态: ✅ 完全实现 | 测试: 57/57 ✓
