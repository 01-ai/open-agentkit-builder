# User Approval Node Implementation Guide

> 完全复刻 OpenAI AgentBuilder 的 User Approval 节点实现

## 📋 目录

- [概述](#概述)
- [数据格式](#数据格式)
- [UI 显示逻辑](#ui-显示逻辑)
- [数据流转](#数据流转)
- [实现细节](#实现细节)
- [测试场景](#测试场景)

---

## 概述

User Approval 节点是一个人工审批节点，用于在工作流执行过程中暂停并等待用户的批准或拒绝。

**核心特性：**

- 固定的两个输出分支（Approval / Reject）
- 可配置的提示消息（Message）
- 可自定义节点名称（Name/Label）
- Message 作为副标题显示在节点上
- 支持变量映射（variable_mapping）

---

## 数据格式

### OpenAI JSON 结构

```json
{
  "id": "node_wkgizfu9",
  "label": "User approval",
  "node_type": "builtins.BinaryApproval",
  "config": {
    "message": "",
    "variable_mapping": []
  },
  "input_schema": {
    "name": "input",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    },
    "additionalProperties": false
  }
}
```

### 关键字段说明

| 字段               | 位置             | 说明                     | 示例                        |
| ------------------ | ---------------- | ------------------------ | --------------------------- |
| `node_type`        | 根级别           | 节点类型标识符           | `"builtins.BinaryApproval"` |
| `label`            | 根级别           | 节点显示名称             | `"need your approval"`      |
| `config.message`   | `config.message` | 向用户显示的提示消息     | `"Yes or no ?"`             |
| `variable_mapping` | `config.*`       | 变量映射数组（暂未使用） | `[]`                        |
| `input_schema`     | 根级别           | 输入数据的 JSON Schema   | `{ name: "input", ... }`    |

---

## UI 显示逻辑

### 节点显示规则

1. **节点标题（Label）**
   - 显示 `label` 字段的值
   - 默认值：`"User approval"`
   - 可通过配置面板的 Name 字段修改

2. **节点副标题（Subtitle）**
   - 显示 `config.message` 字段的值
   - 如果 message 为空，不显示副标题
   - 在标题下方以灰色小字显示

3. **输出分支**
   - 固定显示两个分支：
     - `approval` → 显示 "Approve"
     - `reject` → 显示 "Reject"
   - 不可自定义，不可增减

### 示例场景

| Name                 | Message          | 节点标题显示           | 副标题显示     |
| -------------------- | ---------------- | ---------------------- | -------------- |
| "User approval"      | ""               | **User approval**      | （无）         |
| "need your approval" | "Yes or no ?"    | **need your approval** | Yes or no ?    |
| "Review required"    | "ok to process?" | **Review required**    | ok to process? |

---

## 数据流转

### 完整数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canvas 编辑状态                                           │
│    label = "need your approval"                              │
│    config.message = "Yes or no ?"                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Export 导出 (export-workflow.ts)                         │
│    - 直接导出 config，无需特殊处理                           │
│    - label 保持用户输入                                      │
│    - node_type = "builtins.BinaryApproval"                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JSON 存储 (workflows.json)                               │
│    {                                                         │
│      "node_type": "builtins.BinaryApproval",                │
│      "label": "need your approval",                          │
│      "config": {                                             │
│        "message": "Yes or no ?",                             │
│        "variable_mapping": []                                │
│      }                                                       │
│    }                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Import 导入 (import-workflow.ts)                         │
│    - 映射 builtins.BinaryApproval → user-approval           │
│    - 直接恢复 label 和 config                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Canvas 渲染 (user-approval-node.tsx)                     │
│    - label 作为主标题                                        │
│    - config.message 作为副标题                               │
│    - 固定显示两个分支：Approval / Reject                     │
└─────────────────────────────────────────────────────────────┘
```

### 关键转换点

#### Export 时（Canvas → JSON）

**文件：** `lib/export/export-workflow.ts`

```typescript
// User approval 节点无需特殊处理
// 直接导出 label 和 config
const openAINode: OpenAINode = {
  id: node.id,
  label: data.label || node.id,
  node_type: 'builtins.BinaryApproval',
  config: data.config,
}
```

#### Import 时（JSON → Canvas）

**文件：** `lib/export/import-workflow.ts`

```typescript
// 节点类型映射
function mapNodeType(nodeType: string): string {
  // ...
  case 'BinaryApproval':
    return 'user-approval'
  // ...
}

// 直接使用导入的数据
const node: Node = {
  id: n.id,
  type: mapNodeType(n.node_type),
  position: position,
  data: {
    label: n.label,
    nodeType: n.node_type,
    config: n.config,
  },
}
```

---

## 实现细节

### 文件结构

```
lib/nodes/definitions/
└── user-approval-node.tsx    # 节点定义和配置

app/(canvas)/agent-builder/edit/components/
├── form-nodes/
│   └── user-approval-config.tsx  # 配置表单
└── ui-nodes/
    └── user-approval-node.tsx    # 画布渲染

lib/export/
├── export-workflow.ts        # 导出逻辑
└── import-workflow.ts        # 导入逻辑
```

### 核心组件

#### 1. 节点定义 (`user-approval-node.tsx`)

```typescript
export interface UserApprovalConfig {
  message: string
  variable_mapping: Array<{
    variable_name: string
    source_path: string
  }>
}

export const userApprovalNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('user-approval')!,
  nodeType: 'builtins.BinaryApproval',

  // 固定的输入输出端口
  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [
      {
        id: 'approval',
        label: 'Approval',
        position: 'right',
      },
      {
        id: 'reject',
        label: 'Reject',
        position: 'right',
      },
    ],
  },

  // 默认配置
  getDefaultConfig: (): UserApprovalConfig => ({
    message: '',
    variable_mapping: [],
  }),

  ConfigComponent: UserApprovalConfigComponent,
}
```

#### 2. 配置表单 (`user-approval-config.tsx`)

```typescript
export function UserApprovalConfigForm({
  nodeId,
  config,
  onChange,
}: UserApprovalConfigProps) {
  const { getNode, updateNodeLabel } = useCanvas()

  // 获取节点 label
  const nodeLabel = useMemo(() => {
    return getNode(nodeId)?.data?.label || ''
  }, [getNode, nodeId])

  // 更新 Name（节点 label）
  const handleNameChange = (value: string) => {
    updateNodeLabel?.(nodeId, value)
  }

  // 更新 Message
  const handleMessageChange = (value: string) => {
    onChange({
      ...config,
      message: value,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Name 字段 - 更新节点 label */}
      <div className="flex items-center gap-2">
        <Label className="w-1/4">Name</Label>
        <Input
          value={nodeLabel as string}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="User approval"
        />
      </div>

      {/* Message 字段 - 更新 config.message */}
      <div className="flex flex-col gap-1">
        <Label>Message</Label>
        <FormTextarea
          value={config.message}
          onValueChange={handleMessageChange}
          placeholder="Describe the message to show the user. E.g. ok to process?"
        />
      </div>
    </div>
  )
}
```

**关键点：**

- ✅ 使用 `useCanvas()` hook 获取 `updateNodeLabel` 方法
- ✅ Name 字段直接更新节点的 `label`，而不是 `config`
- ✅ Message 字段更新 `config.message`

#### 3. UI 渲染 (`ui-nodes/user-approval-node.tsx`)

```typescript
export function UserApprovalNode({
  id,
  data,
  selected,
}: UserApprovalNodeProps) {
  const config = data.config

  // 固定的输出端口
  const outputPorts = [
    { id: 'approval', label: 'Approve' },
    { id: 'reject', label: 'Reject' },
  ]

  // subtitle 来自 config.message
  const subtitle = config?.message || undefined

  return (
    <StandardNode
      nodeType="user-approval"
      label={data.label || 'User approval'}
      subtitle={subtitle}
      selected={selected}
      borderColor={
        selected
          ? 'border-amber-600'
          : 'border-amber-500 hover:border-amber-400'
      }
    >
      {/* 输入端口 */}
      <StandardHandle id="in" type="target" selected={selected} />

      {/* 输出分支 */}
      <div className="mt-[7px] flex flex-col gap-0.5">
        {outputPorts.map((port, index) => (
          <BranchInput
            key={port.id}
            index={index}
            totalCount={outputPorts.length}
            label={port.label}
            portId={port.id}
          />
        ))}
      </div>
    </StandardNode>
  )
}
```

**关键点：**

- ✅ 使用 `StandardNode` 基础组件
- ✅ 使用 `BranchInput` 显示分支
- ✅ `config.message` 作为 `subtitle` 传递给 `StandardNode`
- ✅ 琥珀色边框（amber-500/amber-600）

---

## 测试场景

### 场景 1: 创建新节点

**操作：**

1. 从节点面板点击 User approval 节点

**预期：**

- 节点添加到画布中心
- 显示标题 "User approval"
- 显示两个分支：Approval、Reject
- 无副标题

**数据验证：**

```json
{
  "node_type": "builtins.BinaryApproval",
  "label": "User approval",
  "config": {
    "message": "",
    "variable_mapping": []
  }
}
```

### 场景 2: 修改 Name

**操作：**

1. 点击节点打开配置面板
2. 修改 Name 为 "need your approval"

**预期：**

- 画布节点标题立即更新为 "need your approval"
- 配置面板的 Name 字段显示新值

**数据验证：**

```json
{
  "label": "need your approval",
  "config": {
    "message": ""
  }
}
```

### 场景 3: 填写 Message

**操作：**

1. 在配置面板填写 Message 为 "Yes or no ?"

**预期：**

- 画布节点显示副标题 "Yes or no ?"
- 副标题以灰色小字显示在标题下方

**数据验证：**

```json
{
  "config": {
    "message": "Yes or no ?"
  }
}
```

### 场景 4: Name + Message 组合

**操作：**

1. Name 设置为 "need your approval"
2. Message 设置为 "Yes or no ?"

**预期：**

- 节点标题：**need your approval**
- 节点副标题：Yes or no ?
- 两个分支：Approval、Reject

**数据验证：**

```json
{
  "label": "need your approval",
  "config": {
    "message": "Yes or no ?"
  }
}
```

### 场景 5: 清空 Message

**操作：**

1. 清空 Message 字段

**预期：**

- 节点副标题消失
- 只显示主标题
- 分支仍然显示

**数据验证：**

```json
{
  "config": {
    "message": ""
  }
}
```

### 场景 6: 导出和导入

**操作：**

1. 配置 Name 为 "need your approval"，Message 为 "Yes or no ?"
2. 导出 workflow
3. 清空画布
4. 导入 workflow

**预期：**

- 节点完全恢复：标题、副标题、分支
- 配置面板正确显示所有字段

**导出 JSON 验证：**

```json
{
  "id": "node_xxx",
  "label": "need your approval",
  "node_type": "builtins.BinaryApproval",
  "config": {
    "message": "Yes or no ?",
    "variable_mapping": []
  }
}
```

### 场景 7: 连接其他节点

**操作：**

1. 将 Start 节点连接到 User approval 的输入端口
2. 将 User approval 的 Approval 分支连接到 Agent 节点
3. 将 User approval 的 Reject 分支连接到 End 节点

**预期：**

- 连线正常创建
- 输入端口只能有一条连线
- 每个输出分支可以有一条连线

**边数据验证：**

```json
{
  "edges": [
    {
      "source_node_id": "start",
      "source_port_id": "out",
      "target_node_id": "user_approval",
      "target_port_id": "in"
    },
    {
      "source_node_id": "user_approval",
      "source_port_id": "approval",
      "target_node_id": "agent",
      "target_port_id": "in"
    },
    {
      "source_node_id": "user_approval",
      "source_port_id": "reject",
      "target_node_id": "end",
      "target_port_id": "in"
    }
  ]
}
```

---

## 常见问题

### Q1: 为什么 Name 不存储在 config 中？

**A:** 这是 OpenAI AgentBuilder 的设计模式：

- `label` 是节点级别的属性，用于显示和识别
- `config` 是节点配置，用于执行逻辑
- Name 字段修改的是 `label`，而不是 `config.label`

### Q2: 为什么分支是固定的，不能自定义？

**A:** User Approval 是一个 Binary（二元）审批节点，只有两种结果：批准或拒绝。这是 OpenAI 的设计决策，与 If/Else 的多分支逻辑不同。

### Q3: variable_mapping 字段的作用是什么？

**A:** `variable_mapping` 用于在节点间传递变量。目前暂未实现具体功能，但保留字段以保持与 OpenAI 格式一致。

### Q4: 为什么使用 builtins.BinaryApproval 而不是 builtins.UserApproval？

**A:** 这是 OpenAI 的实际实现。从实际的 workflow JSON 可以看出，OpenAI 使用的是 `builtins.BinaryApproval`。我们完全遵循 OpenAI 的规范，只支持 `builtins.BinaryApproval` 这一种类型名称。

---

## 与 If/Else 节点的对比

| 特性         | User Approval             | If/Else                       |
| ------------ | ------------------------- | ----------------------------- |
| 输出分支数量 | 固定 2 个                 | 可变（1+ cases + 1 fallback） |
| 分支名称     | 固定（Approval / Reject） | 可自定义                      |
| 副标题来源   | config.message            | 无副标题                      |
| UI 数据存储  | 不需要 ui_metadata        | 需要存储 caseNames            |
| 配置复杂度   | 简单（Name + Message）    | 复杂（多个 cases + 表达式）   |
| 节点类型     | builtins.BinaryApproval   | builtins.IfElse               |

---

## 版本历史

| 版本  | 日期       | 说明                                   |
| ----- | ---------- | -------------------------------------- |
| 1.0.0 | 2025-10-16 | 初始版本，完全对齐 OpenAI AgentBuilder |

---

## 参考资料

- [OpenAI AgentBuilder 官方文档](https://platform.openai.com/docs)
- [If/Else Node Implementation Guide](./NODE-IF-ELSE.md)
- [React Flow 文档](https://reactflow.dev/)
