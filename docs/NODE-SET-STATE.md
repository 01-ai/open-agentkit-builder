# Set State Node Implementation Guide

> 完全复刻 OpenAI AgentBuilder 的 Set State 节点实现

## 📋 目录

- [概述](#概述)
- [数据格式](#数据格式)
- [UI 显示逻辑](#ui-显示逻辑)
- [数据流转](#数据流转)
- [实现细节](#实现细节)
- [测试场景](#测试场景)

---

## 概述

Set State 节点用于在工作流执行过程中设置全局状态变量的值。

**核心特性：**

- 支持多个变量赋值（assignments）
- 每个赋值包含 CEL 表达式和目标变量名
- 变量名从 Start 节点定义的 state variables 中选择
- 使用 CEL (Common Expression Language) 作为表达式语言

---

## 数据格式

### OpenAI JSON 结构

**初始状态（无赋值）：**

```json
{
  "id": "node_srupfzbv",
  "label": "Set state",
  "node_type": "builtins.SetState",
  "config": {
    "assignments": []
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

**添加赋值后：**

```json
{
  "id": "node_srupfzbv",
  "label": "Set state",
  "node_type": "builtins.SetState",
  "config": {
    "assignments": [
      {
        "expression": {
          "expression": "workflow.input_as_text == 1",
          "format": "cel"
        },
        "name": "key"
      }
    ]
  }
}
```

### 关键字段说明

| 字段                    | 位置                                         | 说明                       | 示例                                   |
| ----------------------- | -------------------------------------------- | -------------------------- | -------------------------------------- |
| `assignments`           | `config.assignments`                         | 赋值数组                   | `[...]`                                |
| `expression`            | `config.assignments[].expression`            | CEL 表达式对象             | `{ expression: "...", format: "cel" }` |
| `expression.expression` | `config.assignments[].expression.expression` | 表达式字符串               | `"workflow.input_as_text == 1"`        |
| `expression.format`     | `config.assignments[].expression.format`     | 表达式格式，固定为 `"cel"` | `"cel"`                                |
| `name`                  | `config.assignments[].name`                  | 目标变量名                 | `"key"`                                |

---

## UI 显示逻辑

### 配置面板结构

```
┌─────────────────────────────────────┐
│  Set State Configuration            │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Assignment 1            [×]  │   │
│  │                             │   │
│  │ Assign value                │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ workflow.input_as_text  │ │   │
│  │ │ == 1                    │ │   │
│  │ └─────────────────────────┘ │   │
│  │                             │   │
│  │ To variable                 │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ Select: key ▼          │ │   │
│  │ └─────────────────────────┘ │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  + Add                      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 表单项

每个 assignment 包含：

1. **Assign value**: 富文本输入框（FormTextarea）
   - 支持 CEL 表达式
   - Placeholder: "Use Common Expression Language to create a custom expression."

2. **To variable**: 下拉选择框（Select）
   - 选项来自 Start 节点的 `state_vars`
   - 如果没有可用变量，显示 "No state variables available"

3. **删除按钮**: 右上角 [×] 按钮

### 默认状态

新创建的 assignment：

- Assign value: 空字符串 `""`
- To variable: 未选择

---

## 数据流转

### 完整数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canvas 编辑状态                                           │
│    config.assignments = [                                    │
│      {                                                       │
│        expression: {                                         │
│          expression: "workflow.input_as_text == 1",         │
│          format: "cel"                                       │
│        },                                                    │
│        name: "key"                                           │
│      }                                                       │
│    ]                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Export 导出 (export-workflow.ts)                         │
│    直接保存，无需额外转换                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JSON 存储 (workflows.json)                               │
│    {                                                         │
│      "config": {                                             │
│        "assignments": [{                                     │
│          "expression": {                                     │
│            "expression": "workflow.input_as_text == 1"       │
│          },                                                  │
│          "name": "key"                                       │
│        }]                                                    │
│      }                                                       │
│    }                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Import 导入 (import-workflow.ts)                         │
│    直接加载，无需额外转换                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Canvas 渲染 (set-state-node.tsx)                         │
│    标准节点，单输入单输出                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现细节

### 架构设计

**端口管理方式：**

Set State 节点使用标准的单输入单输出端口：

- ✅ **输入端口**: `in`
- ✅ **输出端口**: `out`

**数据依赖：**

- 依赖 Start 节点中定义的 `state_vars`
- 通过 `useCanvas()` hook 获取所有节点
- 从 Start 节点提取可用的状态变量列表

### 文件结构

```
lib/nodes/definitions/
└── set-state-node.tsx          # 节点定义和配置

app/(canvas)/agent-builder/edit/components/
├── form-nodes/
│   └── set-state-config.tsx    # 配置表单
└── ui-nodes/
    └── set-state-node.tsx      # 画布渲染

lib/export/
├── export-workflow.ts          # 导出逻辑
└── import-workflow.ts          # 导入逻辑
```

### 核心组件

#### 1. 节点定义 (`definitions/set-state-node.tsx`)

```typescript
export interface SetStateAssignment {
  expression: {
    expression: string
    format: 'cel'
  }
  name: string // Variable name to assign to
}

export interface SetStateConfig {
  assignments: SetStateAssignment[]
}

export const setStateNodeDefinition: NodeDefinition = {
  nodeType: 'builtins.SetState',

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
        id: 'out',
        label: 'Output',
        position: 'right',
      },
    ],
  },

  getDefaultConfig: (): SetStateConfig => ({
    assignments: [],
  }),
}
```

#### 2. 配置表单 (`set-state-config.tsx`)

```typescript
export function SetStateConfigForm({ config, onChange }) {
  const { nodes } = useCanvas()

  // Get state variables from Start node
  const stateVariables = useMemo(() => {
    const startNode = nodes.find((n) => n.type === 'start')
    if (!startNode) return []

    const startConfig = startNode.data?.config as StartConfig
    return startConfig?.state_vars || []
  }, [nodes])

  // Add a new assignment
  const handleAddAssignment = () => {
    const newAssignment: SetStateAssignment = {
      expression: {
        expression: '',
        format: 'cel',
      },
      name: '',
    }

    onChange({
      ...config,
      assignments: [...(config.assignments || []), newAssignment],
    })
  }

  // ... other handlers
}
```

#### 3. UI 渲染 (`ui-nodes/set-state-node.tsx`)

```typescript
export function SetStateNode({ id, data, selected }: SetStateNodeProps) {
  return (
    <StandardNode nodeType="set-state" label="Set state" selected={selected}>
      <StandardHandle id="in" type="target" />
      <StandardHandle id="out" type="source" />
    </StandardNode>
  )
}
```

---

## 测试场景

### 场景 1: 创建新节点

**操作：**

1. 从节点面板拖拽 Set State 节点到画布

**预期：**

- 画布显示 Set State 节点，带有单输入单输出端口
- 配置面板显示：
  - 空的 assignments 列表
  - "+ Add" 按钮

**数据验证：**

```json
{
  "config": {
    "assignments": []
  }
}
```

### 场景 2: 添加第一个赋值

**前提：** Start 节点已定义状态变量 "key"

**操作：**

1. 点击 "+ Add" 按钮
2. 填写 Assign value: `workflow.input_as_text == 1`
3. 选择 To variable: `key`

**预期：**

- 配置面板显示一个赋值项
- 表达式和变量名正确填充

**数据验证：**

```json
{
  "config": {
    "assignments": [
      {
        "expression": {
          "expression": "workflow.input_as_text == 1",
          "format": "cel"
        },
        "name": "key"
      }
    ]
  }
}
```

### 场景 3: 添加多个赋值

**操作：**

1. 点击 "+ Add" 按钮多次
2. 为每个赋值填写不同的表达式和变量

**预期：**

- 配置面板显示多个赋值项
- 每个赋值项独立可编辑
- 每个赋值项有删除按钮

**数据验证：**

```json
{
  "config": {
    "assignments": [
      {
        "expression": {
          "expression": "workflow.input_as_text == 1",
          "format": "cel"
        },
        "name": "key"
      },
      {
        "expression": {
          "expression": "workflow.input_as_text + ' processed'",
          "format": "cel"
        },
        "name": "result"
      }
    ]
  }
}
```

### 场景 4: 删除赋值

**操作：**

1. 点击某个赋值项的删除按钮 [×]

**预期：**

- 该赋值项从配置中移除
- 其他赋值项保持不变

### 场景 5: 无可用状态变量

**前提：** Start 节点未定义任何状态变量

**操作：**

1. 打开 Set State 节点配置

**预期：**

- "+ Add" 按钮禁用
- 显示提示: "Add state variables in the Start node first"
- To variable 下拉框显示: "No state variables available"

### 场景 6: 导出和导入

**操作：**

1. 配置赋值: `workflow.input_as_text == 1` → `key`
2. 导出 workflow
3. 清空画布
4. 导入 workflow

**预期：**

- 导入后配置完整还原
- 表达式和变量名正确

**导出 JSON 验证：**

```json
{
  "config": {
    "assignments": [
      {
        "expression": {
          "expression": "workflow.input_as_text == 1",
          "format": "cel"
        },
        "name": "key"
      }
    ]
  }
}
```

---

## 常见问题

### Q1: 如何获取可用的状态变量列表？

**A:** 通过 `useCanvas()` hook 访问所有节点，找到 Start 节点，从其 `config.state_vars` 中提取：

```typescript
const { nodes } = useCanvas()
const startNode = nodes.find((n) => n.type === 'start')
const stateVariables = startNode?.data?.config?.state_vars || []
```

### Q2: 如果没有 Start 节点或没有状态变量怎么办？

**A:**

- "+ Add" 按钮会被禁用
- 显示提示信息引导用户先在 Start 节点中定义状态变量

### Q3: 表达式格式为什么是嵌套的对象？

**A:** 这是 OpenAI AgentBuilder 的设计，所有表达式都包含：

- `expression`: 表达式字符串
- `format`: 表达式格式（固定为 "cel"）

这样设计便于未来扩展支持其他表达式语言。

### Q4: Set State 和 Start 节点的 state_vars 如何关联？

**A:**

- Start 节点定义可用的状态变量（名称、类型、默认值）
- Set State 节点只能设置 Start 节点中已定义的变量
- 这确保了类型安全和变量的一致性

---

## 版本历史

| 版本  | 日期       | 说明                                   |
| ----- | ---------- | -------------------------------------- |
| 1.0.0 | 2025-10-20 | 初始版本，完全对齐 OpenAI AgentBuilder |

---

## 参考资料

- [OpenAI AgentBuilder 官方文档](https://platform.openai.com/docs)
- [CEL (Common Expression Language) 规范](https://github.com/google/cel-spec)
- [NODE-IF-ELSE.md](./NODE-IF-ELSE.md) - 参考实现
- [OPENAI_AGENT_BUILDER_ANALYSIS.md](./OPENAI_AGENT_BUILDER_ANALYSIS.md) - 整体分析
