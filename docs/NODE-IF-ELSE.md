# If/Else Node Implementation Guide

> 完全复刻 OpenAI AgentBuilder 的 If/Else 节点实现

## 📋 目录

- [概述](#概述)
- [数据格式](#数据格式)
- [UI 显示逻辑](#ui-显示逻辑)
- [数据流转](#数据流转)
- [实现细节](#实现细节)
- [测试场景](#测试场景)

---

## 概述

If/Else 节点是一个条件分支节点，用于根据条件表达式将工作流路由到不同的分支。

**核心特性：**

- 支持多个条件分支（If / Else if / Else if / ...）
- 每个分支有可选的自定义名称（Case name）
- 每个分支有必需的条件表达式（Condition）
- 必有一个 Fallback 分支（永远显示为 "Else"）
- 使用 CEL (Common Expression Language) 作为表达式语言

---

## 数据格式

### OpenAI JSON 结构

```json
{
  "id": "node_c2g0pa4g",
  "label": "If / else",
  "node_type": "builtins.IfElse",
  "config": {
    "cases": [
      {
        "label": "case-0",
        "output_port_id": "case-0",
        "predicate": {
          "expression": "",
          "format": "cel"
        }
      }
    ],
    "fallback": {
      "label": "fallback",
      "output_port_id": "fallback"
    }
  }
}
```

### UI Metadata 结构

```json
{
  "ui_metadata": {
    "dataByNodeId": {
      "node_c2g0pa4g": {
        "caseNames": [""]
      }
    }
  }
}
```

### 关键字段说明

| 字段                   | 位置                                         | 说明                                      | 示例                   |
| ---------------------- | -------------------------------------------- | ----------------------------------------- | ---------------------- |
| `label`                | `config.cases[].label`                       | 系统标识符，导出时规范化为 `case-{index}` | `"case-0"`, `"case-1"` |
| `output_port_id`       | `config.cases[].output_port_id`              | 输出端口ID，与 label 保持一致             | `"case-0"`, `"case-1"` |
| `predicate.expression` | `config.cases[].predicate.expression`        | CEL 条件表达式                            | `"input == 5"`         |
| `predicate.format`     | `config.cases[].predicate.format`            | 表达式格式，固定为 `"cel"`                | `"cel"`                |
| `caseNames`            | `ui_metadata.dataByNodeId[nodeId].caseNames` | 用户自定义的分支名称数组                  | `["A", ""]`            |

---

## UI 显示逻辑

### Branch Input 显示优先级

每个分支的显示标签按以下优先级确定：

```
1. Case name 有值 → 显示 Case name
2. 否则 Condition 有值 → 显示 Condition 表达式
3. 否则 → 显示空字符串
```

**特殊规则：**

- **Fallback 分支永远显示 "Else"**，不受 label 影响

### 示例场景

| Case name     | Condition    | 显示结果          |
| ------------- | ------------ | ----------------- |
| "A"           | "input == 5" | **"A"**           |
| ""            | "input == 5" | **"input == 5"**  |
| ""            | ""           | **""** (空)       |
| "Valid Input" | "input > 0"  | **"Valid Input"** |

### 默认状态

新创建或新增的 case：

- Case name: 空字符串 `""`
- Condition: 空字符串 `""`
- 显示: 空字符串（branch-input 为空）

---

## 数据流转

### 完整数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canvas 编辑状态                                           │
│    config.cases[0].label = ""                               │
│    config.cases[0].predicate.expression = "input == 5"      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Export 导出 (export-workflow.ts)                         │
│    ┌────────────────────────────────────────────────────┐   │
│    │ // 保存用户输入到 ui_metadata                      │   │
│    │ ui_metadata.caseNames = [""]                        │   │
│    │                                                      │   │
│    │ // 规范化 config 中的 label 为系统标识符           │   │
│    │ config.cases[0].label = "case-0"                   │   │
│    └────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JSON 存储 (workflows.json)                               │
│    {                                                         │
│      "config": {                                             │
│        "cases": [{                                           │
│          "label": "case-0",                                  │
│          "output_port_id": "case-0",                         │
│          "predicate": { "expression": "input == 5" }         │
│        }]                                                    │
│      },                                                      │
│      "ui_metadata": {                                        │
│        "dataByNodeId": {                                     │
│          "node_xxx": { "caseNames": [""] }                   │
│        }                                                     │
│      }                                                       │
│    }                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Import 导入 (import-workflow.ts)                         │
│    ┌────────────────────────────────────────────────────┐   │
│    │ // 从 ui_metadata 恢复用户输入                     │   │
│    │ config.cases[0].label = caseNames[0] ?? ""         │   │
│    └────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Canvas 渲染 (if-else-node.tsx)                           │
│    ┌────────────────────────────────────────────────────┐   │
│    │ // 按优先级确定显示标签                            │   │
│    │ if (hasLabel) → display label                      │   │
│    │ else if (hasExpression) → display expression       │   │
│    │ else → display ""                                  │   │
│    └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 关键转换点

#### Export 时（Canvas → JSON）

**文件：** `lib/export/export-workflow.ts`

```typescript
// 1. 收集用户输入的 case names
const caseNames = cases.map((c) => c.label ?? '')

// 2. 保存到 ui_metadata
uiDataByNodeId[nodeId] = {
  caseNames,
}

// 3. 规范化 config 中的 label
const normalizedCases = cases.map((c, index) => ({
  ...c,
  label: `case-${index}`,
}))
```

#### Import 时（JSON → Canvas）

**文件：** `lib/export/import-workflow.ts`

```typescript
// 从 ui_metadata 恢复用户输入
const caseNames = uiData?.[n.id]?.caseNames
config.cases = config.cases.map((c, index) => ({
  ...c,
  label:
    Array.isArray(caseNames) && caseNames[index] !== undefined
      ? caseNames[index]
      : '',
}))
```

---

## 实现细节

### 架构设计

**端口管理方式：**

本项目采用 **UI 组件直接管理端口** 的方式，而非通过节点定义的静态配置：

- ✅ **节点定义** (`definitions/if-else-node.tsx`)：定义基础配置和默认值
- ✅ **UI 组件** (`ui-nodes/if-else-node.tsx`)：根据 `config` 动态生成端口并渲染

**为什么这样设计？**

1. **灵活性**：UI 组件可以根据配置实时计算端口（如 if-else 需要根据 label/expression 优先级显示）
2. **简洁性**：避免在定义层和 UI 层之间传递复杂的端口信息
3. **实时响应**：配置变化时，UI 组件可以立即重新计算和渲染端口

### 文件结构

```
lib/nodes/definitions/
└── if-else-node.tsx          # 节点定义和配置

app/(canvas)/agent-builder/edit/components/
├── form-nodes/
│   └── if-else-config.tsx    # 配置表单
└── ui-nodes/
    └── if-else-node.tsx      # 画布渲染（包含动态端口逻辑）

lib/export/
├── export-workflow.ts        # 导出逻辑
└── import-workflow.ts        # 导入逻辑
```

### 核心组件

#### 1. 节点定义 (`definitions/if-else-node.tsx`)

```typescript
export const ifElseNodeDefinition: NodeDefinition = {
  nodeType: 'builtins.IfElse',

  // 端口配置
  // 注意：输出端口在 UI 组件中根据 config.cases 动态渲染
  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [], // 输出端口动态生成
  },

  // 默认配置
  getDefaultConfig: (): IfElseConfig => ({
    cases: [
      {
        label: '', // ⚠️ 关键：默认为空字符串
        output_port_id: 'case-0',
        predicate: {
          expression: '',
          format: 'cel',
        },
      },
    ],
    fallback: {
      label: 'fallback',
      output_port_id: 'fallback',
    },
  }),
}
```

#### 2. 配置表单 (`if-else-config.tsx`)

```typescript
export function IfElseConfigForm({ config, onChange }) {
  // 新增 case
  const handleAddCase = () => {
    const newCaseId = `case-${config.cases.length}`
    const newCase: IfElseCase = {
      label: '', // ⚠️ 关键：默认为空字符串
      output_port_id: newCaseId,
      predicate: {
        expression: '',
        format: 'cel',
      },
    }

    onChange({
      ...config,
      cases: [...config.cases, newCase],
    })
  }

  // 更新 case 名称
  const handleCaseLabelChange = (index: number, label: string) => {
    const newCases = [...config.cases]
    newCases[index] = {
      ...newCases[index],
      label, // 直接保存用户输入
    }
    onChange({ ...config, cases: newCases })
  }
}
```

#### 3. UI 渲染 (`ui-nodes/if-else-node.tsx`)

**关键职责：动态生成输出端口并渲染**

```typescript
export function IfElseNode({ id, data, selected }) {
  const config = data.config
  const outputPorts: Array<{ id: string; label: string }> = []

  if (config) {
    // ⚠️ 关键：根据 config 动态构建输出端口
    config.cases?.forEach((caseItem) => {
      // 显示逻辑优先级：
      // 1. Case name 有值 → 显示 Case name
      // 2. Condition 有值 → 显示 Condition
      // 3. 否则 → 显示空字符串
      const hasLabel = caseItem.label && caseItem.label.trim() !== ''
      const hasExpression =
        caseItem.predicate?.expression &&
        caseItem.predicate.expression.trim() !== ''

      let displayLabel: string
      if (hasLabel) {
        displayLabel = caseItem.label
      } else if (hasExpression) {
        displayLabel = caseItem.predicate.expression
      } else {
        displayLabel = ''
      }

      outputPorts.push({
        id: caseItem.output_port_id,
        label: displayLabel,
      })
    })

    // Fallback 永远显示 "Else"
    if (config.fallback) {
      outputPorts.push({
        id: config.fallback.output_port_id,
        label: 'Else', // ⚠️ 固定为 "Else"
      })
    }
  }

  return (
    <StandardNode nodeType="if-else" label={data.label || 'If / else'}>
      <StandardHandle id="in" type="target" />
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

---

## 测试场景

### 场景 1: 创建新节点

**操作：**

1. 从节点面板拖拽 If/Else 节点到画布

**预期：**

- 画布显示两个 branch：第一个为空，第二个显示 "Else"
- 配置面板显示：
  - Case name: 空输入框
  - Condition: 空输入框

**数据验证：**

```json
{
  "config": {
    "cases": [{ "label": "", "predicate": { "expression": "" } }],
    "fallback": { "label": "fallback" }
  }
}
```

### 场景 2: 填写 Case name

**操作：**

1. 在配置面板填写 Case name 为 "Valid Input"

**预期：**

- 画布第一个 branch 显示 "Valid Input"
- 第二个 branch 仍显示 "Else"

**数据验证：**

```json
{
  "config": {
    "cases": [{ "label": "Valid Input", ... }]
  }
}
```

### 场景 3: 清空 Case name，填写 Condition

**操作：**

1. 清空 Case name
2. 填写 Condition 为 "input > 0"

**预期：**

- 画布第一个 branch 显示 "input > 0"

**数据验证：**

```json
{
  "config": {
    "cases": [
      {
        "label": "",
        "predicate": { "expression": "input > 0" }
      }
    ]
  }
}
```

### 场景 4: 添加多个分支

**操作：**

1. 点击 "Add" 按钮两次

**预期：**

- 配置面板显示 3 个 If/Else if/Else if 块
- 画布显示 4 个 branch（3个case + 1个Else）
- 新增的 case 默认 label 为空字符串

**数据验证：**

```json
{
  "config": {
    "cases": [
      { "label": "", "output_port_id": "case-0", ... },
      { "label": "", "output_port_id": "case-1", ... },
      { "label": "", "output_port_id": "case-2", ... }
    ]
  }
}
```

### 场景 5: 导出和导入

**操作：**

1. 填写 Case name 为 "A"，Condition 为 "input == 5"
2. 导出 workflow
3. 清空画布
4. 导入 workflow

**预期：**

- 导入后画布显示 "A"
- 配置面板显示 Case name "A"，Condition "input == 5"

**导出 JSON 验证：**

```json
{
  "config": {
    "cases": [
      {
        "label": "case-0", // 规范化
        "predicate": { "expression": "input == 5" }
      }
    ]
  },
  "ui_metadata": {
    "dataByNodeId": {
      "node_xxx": {
        "caseNames": ["A"] // 保存用户输入
      }
    }
  }
}
```

### 场景 6: 删除中间分支

**操作：**

1. 创建 3 个分支（case-0, case-1, case-2）
2. 删除中间的 case-1

**预期：**

- 配置面板显示 2 个 If/Else if 块
- 画布显示 3 个 branch（2个case + 1个Else）
- ⚠️ 注意：剩余的 output_port_id 不会重新编号

**数据验证：**

```json
{
  "config": {
    "cases": [
      { "label": "", "output_port_id": "case-0", ... },
      { "label": "", "output_port_id": "case-2", ... }  // 保持原ID
    ]
  }
}
```

---

## 常见问题

### Q1: 为什么要分离 config.label 和 ui_metadata.caseNames？

**A:** 这是 OpenAI AgentBuilder 的设计模式：

- `config.label` 是系统标识符，用于稳定的端口引用
- `ui_metadata.caseNames` 是用户自定义名称，仅用于显示
- 这样可以保证修改 case name 不会影响现有的连线

### Q2: 为什么 Fallback 不能自定义名称？

**A:** OpenAI AgentBuilder 的设计决策，Fallback 永远显示 "Else"，这是一个约定。

### Q3: 为什么删除分支后 output_port_id 不重新编号？

**A:** 保持稳定性。如果重新编号，会导致现有的连线失效。

### Q4: 如果 ui_metadata.caseNames 缺失会怎样？

**A:** Import 时会使用空字符串作为默认值：

```typescript
label: caseNames[index] ?? ''
```

---

## 版本历史

| 版本  | 日期       | 说明                                             |
| ----- | ---------- | ------------------------------------------------ |
| 1.1.0 | 2025-10-16 | 清理无用代码，移除 getDynamicPorts，更新架构说明 |
| 1.0.0 | 2025-10-16 | 初始版本，完全对齐 OpenAI AgentBuilder           |

---

## 参考资料

- [OpenAI AgentBuilder 官方文档](https://platform.openai.com/docs)
- [CEL (Common Expression Language) 规范](https://github.com/google/cel-spec)
- [React Flow 文档](https://reactflow.dev/)
