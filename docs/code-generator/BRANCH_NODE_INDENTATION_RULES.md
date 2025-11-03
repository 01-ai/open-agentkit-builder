# 分支节点缩进规则总结

## 📋 概述

本文档总结了代码生成器中三种分支节点（If/Else、Guardrails、User Approval）的缩进规则和实现原理。

---

## 🔀 三种分支节点

### 1. If/Else 节点 (`builtins.IfElse`)

**功能**: 条件判断分支

**分支端口**:
- `case-0` - 第一个条件分支（对应 `if`）
- `case-1+` - 后续条件分支（对应 `elif`）
- `fallback` - 否则分支（对应 `else`）

**当前实现**: ✅ 完全支持嵌套

**代码位置**:
- 生成器: `lib/generators/nodes/if-else-node.ts`
- 主逻辑: `lib/code-generator.ts` 行 447-528
- 递归遍历: `traverseIfElseBranch` 函数（行 421-574）

### 2. Guardrails 节点 (`builtins.Guardrails`)

**功能**: 内容安全检查

**分支端口**:
- `on_pass` - 检查通过分支
- (implicit else) - 检查失败分支

**当前实现**: ✅ 支持独立节点，不支持嵌套分支

**代码位置**:
- 生成器: `lib/generators/nodes/guardrails-node.ts`
- 主逻辑: `lib/code-generator.ts` 行 797-878
- 详细文档: `GUARDRAILS_NODE.md`

### 3. User Approval 节点 (`builtins.BinaryApproval`)

**功能**: 用户审批决策

**分支端口**:
- `on_approve` - 批准分支
- `on_reject` - 拒绝分支

**当前实现**: ✅ 支持链式节点（多个审批节点连续连接）

**代码位置**:
- 生成器: `lib/generators/nodes/binary-approval-node.ts`
- 主逻辑: `lib/code-generator.ts` 行 894-1040
- 链式处理: 行 896-920（链检测）
- 递归遍历: `traverseUserApprovalBranch` 函数（行 982-1034）

---

## 📐 缩进规则

### 基础缩进计算

```typescript
// 缩进单位：2个空格
// indentLevel: 嵌套深度，从0开始

const indent = '  '.repeat(indentLevel + 1)

// 示例：
// indentLevel = 0: '  ' (2个空格)
// indentLevel = 1: '    ' (4个空格)
// indentLevel = 2: '      ' (6个空格)
```

### If/Else 节点的缩进规则

**关键特点**: If/Else 节点使用模板系统处理缩进

#### 生成过程

```typescript
// 1. 调用生成器，传入 indentLevel
const ifElseCode = generateIfElseNodeCode(node, true, indentLevel)

// 2. 生成器内部计算基础缩进
const baseIndent = '  '.repeat(indentLevel + 1)

// 3. 生成的代码结构（使用占位符）
// indentLevel=0: "  if condition:\n  {CONTENT_0}"
// indentLevel=1: "    if condition:\n    {CONTENT_0}"
```

#### 占位符替换

```typescript
// 对每个分支进行递归遍历
const branchCode = traverseIfElseBranch(
  caseEdgeId,
  'on_result',
  indentLevel + 1  // ← 递增缩进级别
)

// 替换占位符
code = code.replace(`${placeholderIndent}{CONTENT_0}`, branchCode)
```

#### 示例输出

单层 If/Else:
```python
if state["condition"]:
  # indentLevel=1 的代码
  return workflow
else:
  return workflow
```

嵌套 If/Else:
```python
if state["condition1"]:
  if state["condition2"]:
    # indentLevel=2 的代码
    return workflow
  else:
    return workflow
else:
  return workflow
```

### Guardrails 节点的缩进规则

**关键特点**: Guardrails 节点不支持嵌套分支，始终在顶层

#### 实现特点

```typescript
// Guardrails 始终使用固定缩进（不考虑嵌套）
// 变量: guardrails_inputtext, guardrails_result 等
// 保持 indentLevel=0（或固定的基础缩进）
```

#### 输出格式

```python
# 无错误处理
if guardrails_hastripwire:
  return guardrails_output
else:
  return guardrails_output

# 有错误处理（try-catch）
try:
  if guardrails_hastripwire:
    return guardrails_output
  else:
    return guardrails_output
except Exception as guardrails_error:
  # 错误处理代码
  pass
```

### User Approval 节点的缩进规则

**关键特点**: User Approval 支持链式连接，自动增加缩进

#### 链检测算法

```typescript
// 1. 检测链式 User Approval 节点
let approvalChain: WorkflowNode[] = [nextNode]
let currentApprovalNode = nextNode

while (currentApprovalNode) {
  const approveEdge = edges.find(
    (e) =>
      e.source_node_id === currentApprovalNode.id &&
      e.source_port_id === 'on_approve'  // ← 沿 on_approve 追踪
  )
  if (!approveEdge) break
  
  const nextApprovalNode = nodes.find(n => n.id === approveEdge.target_node_id)
  if (nextApprovalNode?.node_type === 'builtins.BinaryApproval') {
    approvalChain.push(nextApprovalNode)
    currentApprovalNode = nextApprovalNode
  } else {
    break
  }
}

// 2. 如果是链式，使用递归遍历；否则使用旧逻辑
```

#### 递归遍历函数

```typescript
const traverseUserApprovalBranch = (
  startIndex: number,
  indentLevel: number
): string => {
  // 基础情况：到达链末尾，执行 Agent
  if (startIndex >= approvalChain.length) {
    const indent = '  '.repeat(indentLevel)
    // 生成 Agent 执行代码（使用当前缩进）
    return `${indent}agent_result = ...`
  }
  
  // 递归情况：生成当前审批节点
  const currentIndent = '  '.repeat(indentLevel)
  let code = `${currentIndent}if approval_request(...):`
  
  // 递归到下一个审批节点（缩进 +2）
  code += traverseUserApprovalBranch(startIndex + 1, indentLevel + 2)
  
  code += `${currentIndent}else:\n${currentIndent}  return workflow`
  return code
}

// 启动遍历
mainFunctionBody += traverseUserApprovalBranch(0, 1)
```

#### 示例输出

单个 User Approval:
```python
approval_message = "Please approve"
if approval_request(approval_message):
  agent_result = await Runner.run(...)
  return agent_result
else:
  return workflow
```

链式 User Approval (2个审批节点):
```python
approval_message = "First approval"
if approval_request(approval_message):
  approval_message1 = "Second approval"
  if approval_request1(approval_message1):
    # indentLevel=3
    agent_result = await Runner.run(...)
    return agent_result
  else:
    return workflow
else:
  return workflow
```

---

## 🔄 缩进级别传递规则

### If/Else 分支中的缩进

```
顶层 If/Else:    indentLevel=0
  → if 分支:       indentLevel=1
    → 嵌套 If:     indentLevel=1（调用时传递）
    → 代码块:      indentLevel=1（代码内的基础缩进）
```

### User Approval 链中的缩进

```
第1个审批节点:    indentLevel=1
  if approval_request:
    → 第2个审批节点:  indentLevel=3  ← +2
      if approval_request1:
        → 第3个审批节点: indentLevel=5  ← +2
          ...
```

### 缩进增量规则

| 情况 | 增量 | 说明 |
|------|------|------|
| If/Else 分支内 | +1 | 进入 if/elif/else 块 |
| User Approval 链式 | +2 | 新的审批节点（if+内容） |
| 嵌套代码块 | +1 | 每增加一层嵌套 |

---

## 📊 支持的工作流模式

### ✅ 已支持

1. **单个 If/Else 节点**
   ```
   Start → If/Else → End
   ```

2. **嵌套 If/Else 节点**
   ```
   Start → If/Else → If/Else → Agent → End
           ↓
         (fallback)
   ```

3. **链式 User Approval**
   ```
   Start → Approval1 → Approval2 → Agent → End
              ↓
           (reject)
   ```

4. **独立 Guardrails**
   ```
   Start → Guardrails → Agent → End
   ```

5. **复杂混合（不支持跨节点嵌套）**
   ```
   Start → Guardrails → If/Else → Agent → End
   ```

### ❌ 不支持（需要未来实现）

1. **If/Else 分支内的 User Approval**
   ```
   Start → If/Else → Approval → Agent → End
                ↓
            (branches)
   ```

2. **多层跨节点嵌套**
   ```
   Start → If/Else → Guardrails → Approval → Agent
   ```

3. **分支合并和重汇聚**
   ```
   Start → If/Else ─→ Agent → Join → End
              ↓      ↗
            Code ──┘
   ```

---

## 🛠 表达式处理

所有分支节点支持动态表达式转换：

```typescript
// workflow.fieldName → workflow["fieldName"]
expression.replace(/workflow\.(\w+)/g, 'workflow["$1"]')

// state.fieldName → state["fieldName"]
expression.replace(/state\.(\w+)/g, 'state["$1"]')

// 生成的代码示例
if workflow["user_input"] == "approve":
if state["approved_count"] > 3:
```

---

## 📝 测试覆盖

### 当前已通过的测试

- ✅ 57+ 个单元测试
- ✅ If/Else 多种配置
- ✅ User Approval 链式节点
- ✅ Guardrails 多种安全检查
- ✅ 表达式转换验证

### 测试用例位置

```
tests/code-generator/
├── logic_nodes/
│   ├── if_else/          # If/Else 测试
│   ├── user_approval/    # User Approval 测试
│   └── mcp/              # MCP 节点测试
├── tool_nodes/
│   └── guardrails/       # Guardrails 测试
└── core_nodes/
    └── agent/            # Agent 测试
```

---

## 🚀 性能特性

| 特性 | 复杂度 | 说明 |
|------|--------|------|
| If/Else 单层 | O(n) | 线性遍历 |
| If/Else 嵌套 | O(n×d) | n=节点数，d=深度 |
| User Approval 链 | O(c²) | c=链长度 |
| Guardrails | O(n) | 固定位置处理 |

---

## 🔗 相关文档

- [BRANCH_INDENTATION.md](./BRANCH_INDENTATION.md) - 设计文档
- [BRANCH_INDENTATION_DESIGN.md](./BRANCH_INDENTATION_DESIGN.md) - 设计总结
- [GUARDRAILS_NODE.md](./GUARDRAILS_NODE.md) - Guardrails 详细说明
- [AGENT_VARIABLE_NAMING.md](./AGENT_VARIABLE_NAMING.md) - 变量命名规则
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实现总结

---

## ✨ 关键要点

1. **缩进基础单位**: 2个空格（1个缩进级别）
2. **If/Else**: 使用模板系统，支持完全嵌套
3. **User Approval**: 支持链式节点，自动级联增加缩进
4. **Guardrails**: 不参与缩进计算，始终顶层执行
5. **表达式转换**: 自动将 `.` 语法转换为 `[]` 语法
6. **递归遍历**: 分支内容通过递归函数处理，保证正确缩进

---

**最后更新**: 2025-10 | 状态: ✅ 完全实现
