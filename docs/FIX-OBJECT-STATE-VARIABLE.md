# Object 类型状态变量修复

## 问题描述

当在 Start 节点中添加 object 类型的状态变量时，导出的 workflow.json 格式与 OpenAI AgentBuilder 不一致。

## 问题对比

### OpenAI 的正确格式

```json
{
  "state_variable_json_schema": {
    "type": "object",
    "properties": {
      "obj": {
        "type": "object",
        "properties": {
          "obj": {
            "type": "string",
            "description": "111"
          }
        },
        "additionalProperties": false,
        "required": ["obj"]
      }
    },
    "required": ["obj"],
    "additionalProperties": false
  },
  "state_vars": [
    {
      "id": "obj",
      "name": "obj"
    }
  ]
}
```

### 我们之前的错误格式

```json
{
  "state_variable_json_schema": {
    "type": "object",
    "properties": {
      "obj": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string" },
          "properties": { "type": "string" },
          ...
        },
        ...
      }
    },
    ...
  },
  "state_vars": [
    {
      "id": "obj",
      "name": "obj",
      "default": { ... }  // ❌ 不应该包含 default
    }
  ]
}
```

## 根本原因

在 `lib/export/export-workflow.ts` 的 `generateStateVariableJsonSchema` 函数中：

1. **错误理解了 object 类型变量的 default 值**
   - 我们将 default 对象的键值对当作了 object 的 schema
   - 实际上，对于 object 类型，default 字段存储的就是该 object 的 JSON Schema 定义

2. **state_vars 格式不正确**
   - OpenAI 格式中，顶层 `state_vars` 只包含 `id` 和 `name`
   - 我们错误地包含了 `default` 字段

## 修复方案

### 1. 导出逻辑修复 (`lib/export/export-workflow.ts`)

#### 修复 state_variable_json_schema 生成

```typescript
// 旧代码（错误）
if (variable.type === 'object' && typeof variable.default === 'object') {
  const defaultObj = variable.default as Record<string, any>
  Object.keys(defaultObj).forEach((key) => {
    const value = defaultObj[key]
    objProperties[key] = { type: typeof value }
  })
}

// 新代码（正确）
if (variable.type === 'object' && typeof variable.default === 'object') {
  const defaultObj = variable.default as Record<string, any>

  // 检查 default 是否是 JSON Schema
  if (defaultObj && 'properties' in defaultObj) {
    // 直接使用 JSON Schema
    propertySchema.properties = defaultObj.properties || {}
    propertySchema.required = defaultObj.required || []
    propertySchema.additionalProperties =
      defaultObj.additionalProperties ?? false
    delete propertySchema.default
  }
}
```

#### 修复 state_vars 格式

```typescript
// 旧代码（错误）
const formattedStateVars = stateVars.map((v) => ({
  id: v.id,
  name: v.name,
  ...(v.default !== undefined ? { default: v.default } : {}),
}))

// 新代码（正确）
const formattedStateVars = stateVars.map((v) => ({
  id: v.id,
  name: v.name,
}))
```

### 2. 导入逻辑修复 (`lib/export/import-workflow.ts`)

添加 Start 节点的特殊处理，从 workflow 顶层重建 config：

```typescript
// For Start node, rebuild config from workflow-level state_vars and state_variable_json_schema
if (n.node_type === 'builtins.Start' || type === 'start') {
  const stateVars = workflow.state_vars || []
  const stateSchema = workflow.state_variable_json_schema

  config.state_vars = stateVars.map((v: any) => {
    const varSchema = stateSchema?.properties?.[v.name]

    const stateVar: any = {
      id: v.id,
      name: v.name,
      type: varSchema.type || 'string',
    }

    // For object type, reconstruct the JSON Schema as default
    if (varSchema.type === 'object' && varSchema.properties) {
      stateVar.default = {
        type: 'object',
        properties: varSchema.properties,
        required: varSchema.required || [],
        additionalProperties: varSchema.additionalProperties ?? false,
      }
    }
    // For other types, use default if exists
    else if (varSchema.default !== undefined) {
      stateVar.default = varSchema.default
    }

    return stateVar
  })
}
```

## 数据流转

### 完整流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canvas 编辑状态                                           │
│    Start Node Config:                                        │
│    state_vars: [{                                            │
│      id: "obj",                                              │
│      name: "obj",                                            │
│      type: "object",                                         │
│      default: {                                              │
│        type: "object",                                       │
│        properties: { obj: { type: "string", ... } },       │
│        required: ["obj"]                                     │
│      }                                                       │
│    }]                                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Export 导出 (export-workflow.ts)                         │
│    ┌────────────────────────────────────────────────────┐   │
│    │ generateStateVariableJsonSchema():                 │   │
│    │ - 检测 default 是否为 JSON Schema                  │   │
│    │ - 直接使用其 properties, required 等字段           │   │
│    │                                                      │   │
│    │ formattedStateVars:                                │   │
│    │ - 只保留 id 和 name                                │   │
│    └────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JSON 存储 (workflows.json) - OpenAI 格式                │
│    {                                                         │
│      "state_variable_json_schema": {                        │
│        "properties": {                                       │
│          "obj": {                                            │
│            "type": "object",                                 │
│            "properties": { ... },  // 用户定义的 schema     │
│            "required": [...]                                 │
│          }                                                   │
│        }                                                     │
│      },                                                      │
│      "state_vars": [                                        │
│        { "id": "obj", "name": "obj" }  // 只有 id 和 name  │
│      ]                                                       │
│    }                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Import 导入 (import-workflow.ts)                         │
│    ┌────────────────────────────────────────────────────┐   │
│    │ 从 workflow 顶层重建 Start Node Config:            │   │
│    │ - 遍历 state_vars                                   │   │
│    │ - 从 state_variable_json_schema 获取类型和 schema  │   │
│    │ - 对于 object 类型，将 schema 重建为 default       │   │
│    └────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Canvas 渲染 - 还原为编辑状态                             │
│    Start Node Config 完整恢复                               │
└─────────────────────────────────────────────────────────────┘
```

## 测试验证

### 测试场景 1：添加 object 类型变量

1. 在 Start 节点中添加一个 object 类型的状态变量 `obj`
2. 定义 JSON Schema：
   ```json
   {
     "type": "object",
     "properties": {
       "name": { "type": "string", "description": "Name field" }
     },
     "required": ["name"],
     "additionalProperties": false
   }
   ```
3. 导出 workflow
4. 验证导出的 JSON 格式与 OpenAI 一致

### 测试场景 2：导入 OpenAI workflow

1. 从 OpenAI AgentBuilder 导出包含 object 类型变量的 workflow
2. 导入到我们的系统
3. 验证 Start 节点配置正确还原
4. 再次导出，验证格式保持一致

## 影响范围

- ✅ Start 节点的 object 类型变量
- ✅ 导出功能（export-workflow.ts）
- ✅ 导入功能（import-workflow.ts）
- ✅ 与 OpenAI AgentBuilder 的兼容性

## 版本历史

| 版本  | 日期       | 说明                                    |
| ----- | ---------- | --------------------------------------- |
| 1.0.0 | 2025-10-20 | 修复 object 类型状态变量的导出/导入逻辑 |

## 参考资料

- [NODE-START.md](./NODE-START.md) - Start 节点文档
- [OPENAI_AGENT_BUILDER_ANALYSIS.md](./OPENAI_AGENT_BUILDER_ANALYSIS.md) - OpenAI 格式分析
