# Start Node Implementation Guide

> 完全复刻 OpenAI AgentBuilder 的 Start 节点实现

## 📋 目录

- [概述](#概述)
- [数据格式](#数据格式)
- [UI 显示逻辑](#ui-显示逻辑)
- [数据流转](#数据流转)
- [实现细节](#实现细节)
- [测试场景](#测试场景)

---

## 概述

Start 节点是工作流的起点节点，定义了工作流的输入变量和全局状态变量。

**核心特性：**

- 全局唯一，每个工作流只能有一个 Start 节点
- 不可删除
- 只有一个输出，没有输入
- 固定的输入变量：`input_as_text` (string)
- 可配置全局状态变量（State variables）
- 支持 5 种变量类型：String, Number, Boolean, Object, Array

---

## 数据格式

### OpenAI JSON 结构

#### 1. 仅包含默认输入变量（无状态变量）

```json
{
  "nodes": [
    {
      "id": "node_rz2qpojk",
      "label": "Start",
      "node_type": "builtins.Start"
    }
  ],
  "start_node_id": "node_rz2qpojk",
  "input_variable_json_schema": {
    "type": "object",
    "properties": {
      "input_as_text": {
        "type": "string"
      }
    },
    "required": ["input_as_text"],
    "additionalProperties": false
  },
  "state_variable_json_schema": {
    "type": "object",
    "properties": {},
    "required": [],
    "additionalProperties": false
  },
  "state_vars": []
}
```

#### 2. 包含多种类型的状态变量

```json
{
  "nodes": [
    {
      "id": "node_rz2qpojk",
      "label": "Start",
      "node_type": "builtins.Start"
    }
  ],
  "start_node_id": "node_rz2qpojk",
  "input_variable_json_schema": {
    "type": "object",
    "properties": {
      "input_as_text": {
        "type": "string"
      }
    },
    "required": ["input_as_text"],
    "additionalProperties": false
  },
  "state_variable_json_schema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "default": "Jack"
      },
      "age": {
        "type": "number",
        "default": 18
      },
      "gender_male": {
        "type": "boolean",
        "default": true
      },
      "fitness": {
        "type": "object",
        "properties": {
          "height": {
            "type": "number"
          },
          "weight": {
            "type": "number"
          },
          "heartbeat": {
            "type": "number"
          }
        },
        "additionalProperties": false,
        "required": ["height", "weight", "heartbeat"]
      },
      "todos": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "finish start node",
          "finish end node",
          "finish variable define"
        ]
      }
    },
    "required": ["name", "age", "gender_male", "fitness", "todos"],
    "additionalProperties": false
  },
  "state_vars": [
    {
      "id": "name",
      "default": "Jack",
      "name": "name"
    },
    {
      "id": "age",
      "default": 18,
      "name": "age"
    },
    {
      "id": "gender_male",
      "default": true,
      "name": "gender_male"
    },
    {
      "id": "fitness",
      "name": "fitness"
    },
    {
      "id": "todos",
      "default": [
        "finish start node",
        "finish end node",
        "finish variable define"
      ],
      "name": "todos"
    }
  ]
}
```

### 关键字段说明

| 字段                         | 位置                | 说明                     | 示例                      |
| ---------------------------- | ------------------- | ------------------------ | ------------------------- |
| `node_type`                  | `nodes[].node_type` | 节点类型标识符           | `"builtins.Start"`        |
| `label`                      | `nodes[].label`     | 节点显示名称             | `"Start"`                 |
| `start_node_id`              | 根级别              | Start 节点的 ID          | `"node_rz2qpojk"`         |
| `input_variable_json_schema` | 根级别              | 输入变量的 JSON Schema   | `{ type: "object", ... }` |
| `state_variable_json_schema` | 根级别              | 状态变量的 JSON Schema   | `{ type: "object", ... }` |
| `state_vars`                 | 根级别              | 状态变量数组（简化格式） | `[{ id, name, default }]` |

---

## UI 显示逻辑

### 配置面板结构

Start 节点的配置面板包含两个主要部分：

#### 1. **Input variables（输入变量）** - 只读显示

- 固定显示 `input_as_text` 变量（string 类型）
- 不可编辑，不可删除
- 以只读卡片形式展示

#### 2. **State variables（状态变量）** - 可编辑

每个状态变量包含以下配置项：

1. **Type（类型）** - 使用 ToggleGroup 切换
   - String - 字符串类型
   - Number - 数字类型
   - Boolean - 布尔类型
   - Object - 对象类型
   - List - 数组类型

2. **Name（名称）** - 文本输入框
   - 变量名称
   - 同时作为变量的 `id`

3. **Default value (optional)（默认值）** - 根据类型动态显示
   - **String/Number**: 使用 Input 输入框
   - **Boolean**: 使用 ToggleGroup 选择 True/False
   - **Array/Object**: 使用 Textarea 输入 JSON 格式

### 变量类型与输入方式

| 类型    | 输入方式        | 示例输入                                         | 备注                 |
| ------- | --------------- | ------------------------------------------------ | -------------------- |
| String  | Input 文本框    | `"Jack"`                                         | 普通文本             |
| Number  | Input 数字框    | `18`                                             | type="number"        |
| Boolean | ToggleGroup     | True / False                                     | 二选一               |
| Array   | Textarea (JSON) | `["item1", "item2"]`                             | 需要有效的 JSON 数组 |
| Object  | Textarea (JSON) | `{"height": 180, "weight": 70, "heartbeat": 72}` | 需要有效的 JSON 对象 |

### 操作按钮

- **Add variable** - 添加新的状态变量
- **Remove** (删除按钮) - 删除当前变量

---

## 数据流转

### 1. 内部数据结构（React Flow）

```typescript
// Start 节点的配置数据类型
export type StateVariableType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface StateVariable {
  id: string
  name: string
  type: StateVariableType
  default?: string | number | boolean | object | any[]
}

export interface StartConfig {
  state_vars: StateVariable[]
}

// 节点数据结构
{
  id: "node_start_123",
  type: "start",
  data: {
    label: "Start",
    nodeType: "builtins.Start",
    config: {
      state_vars: [
        {
          id: "name",
          name: "name",
          type: "string",
          default: "Jack"
        }
      ]
    }
  },
  position: { x: 100, y: 100 }
}
```

### 2. 导出到 OpenAI 格式

导出时执行以下转换：

1. **提取状态变量**

   ```typescript
   const startConfig = startNode?.data?.config as StartConfig
   const stateVars = startConfig?.state_vars || []
   ```

2. **生成 `state_vars` 数组**（简化格式）

   ```typescript
   const formattedStateVars = stateVars.map((v) => ({
     id: v.id,
     name: v.name,
     ...(v.default !== undefined && v.default !== ''
       ? { default: v.default }
       : {}),
   }))
   ```

3. **生成 `state_variable_json_schema`**
   - 根据变量类型映射到 JSON Schema 类型
   - 为 Object 类型生成 properties 和 required
   - 为 Array 类型生成 items schema

### 3. JSON Schema 生成规则

#### String 类型

```json
{
  "name": {
    "type": "string",
    "default": "Jack"
  }
}
```

#### Number 类型

```json
{
  "age": {
    "type": "number",
    "default": 18
  }
}
```

#### Boolean 类型

```json
{
  "gender_male": {
    "type": "boolean",
    "default": true
  }
}
```

#### Array 类型

```json
{
  "todos": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "default": ["item1", "item2"]
  }
}
```

#### Object 类型

```json
{
  "fitness": {
    "type": "object",
    "properties": {
      "height": { "type": "number" },
      "weight": { "type": "number" },
      "heartbeat": { "type": "number" }
    },
    "additionalProperties": false,
    "required": ["height", "weight", "heartbeat"]
  }
}
```

---

## 实现细节

### 文件结构

```
lib/nodes/definitions/
  └── start-node.tsx                    # 节点定义和类型

app/(canvas)/agent-builder/edit/components/
  ├── ui-nodes/
  │   └── start-node.tsx                # UI 渲染组件（已存在）
  └── form-nodes/
      ├── start-config.tsx              # 配置表单组件（新增）
      └── index.tsx                     # 导出（已更新）

lib/export/
  └── export-workflow.ts                # 导出逻辑（已更新）
```

### 核心实现

#### 1. 节点定义 (`lib/nodes/definitions/start-node.tsx`)

```typescript
import { StartConfigForm } from '@/app/(canvas)/agent-builder/edit/components/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions
export type StateVariableType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface StateVariable {
  id: string
  name: string
  type: StateVariableType
  default?: string | number | boolean | object | any[]
}

export interface StartConfig {
  state_vars: StateVariable[]
}

// Configuration component wrapper
const StartConfigComponent: React.FC<ConfigComponentProps> = ({
  config,
  onChange,
}) => {
  return <StartConfigForm config={config} onChange={onChange} />
}

// Node definition
export const startNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('start')!,
  nodeType: 'builtins.Start',

  ports: {
    inputs: [],
    outputs: [{ id: 'out', label: 'Output', position: 'right' }],
  },

  getDefaultConfig: (): StartConfig => ({
    state_vars: [],
  }),

  ConfigComponent: StartConfigComponent,
}
```

#### 2. 配置表单组件 (`start-config.tsx`)

主要功能模块：

1. **StateVariableEditor** - 单个变量的编辑器
   - 类型选择（ToggleGroup）
   - 名称输入
   - 默认值输入（根据类型动态渲染）

2. **StartConfigForm** - 主表单组件
   - Input variables 只读显示
   - State variables 列表管理
   - 添加/删除变量功能

3. **辅助函数**
   - `getDefaultValueForType()` - 获取类型的默认值
   - `handleTypeChange()` - 类型切换时重置默认值
   - `handleDefaultChange()` - 根据类型解析输入值

#### 3. 导出逻辑 (`lib/export/export-workflow.ts`)

关键函数：

1. **extractWorkflowData()**

   ```typescript
   // Extract state variables from start node
   const startConfig = startNode?.data?.config as StartConfig | undefined
   const stateVars = startConfig?.state_vars || []

   // Generate JSON Schema
   const stateVariableJsonSchema = generateStateVariableJsonSchema(stateVars)

   // Format for export
   const formattedStateVars = stateVars.map((v) => ({
     id: v.id,
     name: v.name,
     ...(v.default !== undefined ? { default: v.default } : {}),
   }))
   ```

2. **generateStateVariableJsonSchema()**

   ```typescript
   function generateStateVariableJsonSchema(
     stateVars: StateVariable[]
   ): JSONSchema {
     const properties: Record<string, any> = {}
     const required: string[] = []

     stateVars.forEach((variable) => {
       // Map type to JSON Schema type
       const jsonType = mapTypeToJsonSchemaType(variable.type)

       const propertySchema: any = {
         type: jsonType,
       }

       // Add default value
       if (variable.default !== undefined && variable.default !== '') {
         propertySchema.default = variable.default
       }

       // Special handling for object type
       if (variable.type === 'object' && typeof variable.default === 'object') {
         // Generate properties from default object
         // ...
       }

       // Special handling for array type
       if (variable.type === 'array' && Array.isArray(variable.default)) {
         // Infer items type from first element
         // ...
       }

       properties[variable.name] = propertySchema
       required.push(variable.name)
     })

     return {
       type: 'object',
       properties,
       required,
       additionalProperties: false,
     }
   }
   ```

---

## 测试场景

### 测试用例 1: 无状态变量

**操作步骤：**

1. 创建新的工作流
2. 点击 Start 节点
3. 不添加任何状态变量
4. 导出 OpenAI JSON

**预期结果：**

```json
{
  "state_vars": [],
  "state_variable_json_schema": {
    "type": "object",
    "properties": {},
    "required": [],
    "additionalProperties": false
  }
}
```

### 测试用例 2: String 类型变量

**操作步骤：**

1. 点击 "Add variable"
2. 选择 Type: String
3. Name: `name`
4. Default value: `Jack`
5. 导出 OpenAI JSON

**预期结果：**

```json
{
  "state_vars": [
    {
      "id": "name",
      "name": "name",
      "default": "Jack"
    }
  ],
  "state_variable_json_schema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "default": "Jack"
      }
    },
    "required": ["name"],
    "additionalProperties": false
  }
}
```

### 测试用例 3: Number 类型变量

**操作步骤：**

1. 添加变量
2. 选择 Type: Number
3. Name: `age`
4. Default value: `18`
5. 导出 OpenAI JSON

**预期结果：**

```json
{
  "age": {
    "type": "number",
    "default": 18
  }
}
```

### 测试用例 4: Boolean 类型变量

**操作步骤：**

1. 添加变量
2. 选择 Type: Boolean
3. Name: `gender_male`
4. 选择 Default value: True
5. 导出 OpenAI JSON

**预期结果：**

```json
{
  "gender_male": {
    "type": "boolean",
    "default": true
  }
}
```

### 测试用例 5: Array 类型变量

**操作步骤：**

1. 添加变量
2. 选择 Type: List
3. Name: `todos`
4. Default value: `["finish start node", "finish end node", "finish variable define"]`
5. 导出 OpenAI JSON

**预期结果：**

```json
{
  "todos": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "default": [
      "finish start node",
      "finish end node",
      "finish variable define"
    ]
  }
}
```

### 测试用例 6: Object 类型变量

**操作步骤：**

1. 添加变量
2. 选择 Type: Object
3. Name: `fitness`
4. Default value: `{"height": 180, "weight": 70, "heartbeat": 72}`
5. 导出 OpenAI JSON

**预期结果：**

```json
{
  "fitness": {
    "type": "object",
    "properties": {
      "height": { "type": "number" },
      "weight": { "type": "number" },
      "heartbeat": { "type": "number" }
    },
    "additionalProperties": false,
    "required": ["height", "weight", "heartbeat"]
  }
}
```

### 测试用例 7: 混合多种类型

**操作步骤：**

1. 添加 String 类型变量：`name` = `"Jack"`
2. 添加 Number 类型变量：`age` = `18`
3. 添加 Boolean 类型变量：`gender_male` = `true`
4. 添加 Object 类型变量：`fitness` = `{"height": 180, "weight": 70, "heartbeat": 72}`
5. 添加 Array 类型变量：`todos` = `["item1", "item2", "item3"]`
6. 导出 OpenAI JSON

**预期结果：**
完整的 `state_variable_json_schema` 包含所有 5 个变量，每个变量都有正确的类型定义和默认值。

### 测试用例 8: 删除变量

**操作步骤：**

1. 添加多个变量
2. 点击某个变量的删除按钮
3. 确认变量被移除
4. 导出 JSON 确认不包含已删除的变量

### 测试用例 9: 类型切换

**操作步骤：**

1. 添加一个 String 类型变量，设置默认值
2. 切换类型为 Number
3. 确认默认值被重置为 `0`
4. 切换类型为 Boolean
5. 确认默认值被重置为 `false`

### 测试用例 10: JSON 格式验证

**操作步骤：**

1. 添加 Array 类型变量
2. 输入无效的 JSON：`[item1, item2]`（缺少引号）
3. 确认系统能处理错误（使用空数组）
4. 输入有效的 JSON：`["item1", "item2"]`
5. 确认正确解析

---

## 已知限制和未来改进

### 当前限制

1. **Object 类型输入**
   - 目前使用 Textarea 手动输入 JSON
   - 需要用户了解 JSON 语法
   - 没有实时验证和语法高亮

2. **Array 类型推断**
   - 只根据第一个元素推断 items 类型
   - 不支持混合类型数组
   - 不支持嵌套复杂结构

3. **变量名验证**
   - 没有变量名重复检查
   - 没有特殊字符限制
   - 没有保留字检查

### 未来改进方向

1. **可视化 JSON Schema Editor**
   - 为 Object 类型提供可视化编辑器
   - 支持嵌套属性定义
   - 实时预览生成的 JSON Schema

2. **增强验证**
   - 变量名唯一性检查
   - 变量名格式验证（snake_case）
   - JSON 格式实时验证和错误提示

3. **更好的类型推断**
   - 支持更复杂的 Array items 定义
   - 支持嵌套对象和数组
   - 支持自定义 JSON Schema 属性

4. **导入功能**
   - 从 JSON Schema 导入状态变量
   - 从现有变量复制
   - 批量导入

---

## 参考

- [OpenAI AgentBuilder 官方文档](https://platform.openai.com/)
- [JSON Schema 规范](https://json-schema.org/)
- [React Flow 文档](https://reactflow.dev/)

---

## 更新记录

| 日期       | 版本 | 说明                              | 作者 |
| ---------- | ---- | --------------------------------- | ---- |
| 2025-10-17 | 1.0  | 初始版本，完成 Start 节点基础实现 | AI   |

---

**文档完成时间**: 2025-10-17
**实现状态**: ✅ 已完成
**测试状态**: ⏳ 待用户测试
