# Set State 节点 - 嵌套变量支持

## 功能概述

实现了 Set State 节点对 Object 类型变量的子属性展开和赋值功能，允许用户直接为 Object 的子属性赋值，而不仅仅是整个 Object。

## 问题描述

在 OpenAI AgentBuilder 中，当 Start 节点有一个 Object 类型的状态变量时，例如：

```json
{
  "name": "obj",
  "type": "object",
  "properties": {
    "attr1": {
      "type": "string",
      "description": "1",
      "default": ""
    },
    "attr2": {
      "type": "string",
      "description": "2"
    }
  }
}
```

在 Set State 节点的 "To variable" 下拉框中，除了可以选择整个 `obj` 对象外，还可以选择其子属性 `attr1` 和 `attr2` 进行单独赋值。

## 实现方案

### 1. 数据结构

定义了 `FlattenedVariable` 接口来表示扁平化的变量：

```typescript
interface FlattenedVariable extends StateVariable {
  fullPath: string // e.g., "obj.attr1" or "str"
  displayName: string // e.g., "attr1" or "str"
  parentName?: string // e.g., "obj" for nested properties
}
```

### 2. 变量扁平化函数

`flattenStateVariables` 函数负责将状态变量扁平化，展开 Object 类型的属性：

```typescript
function flattenStateVariables(
  stateVars: StateVariable[]
): FlattenedVariable[] {
  const flattened: FlattenedVariable[] = []

  stateVars.forEach((variable) => {
    // 添加顶层变量
    flattened.push({
      ...variable,
      fullPath: variable.name,
      displayName: variable.name,
    })

    // 如果是 object 类型，展开其 properties
    if (variable.type === 'object' && variable.default) {
      const defaultObj = variable.default as Record<string, unknown>

      // 检查 default 是否为 JSON Schema（有 properties 字段）
      if (
        defaultObj &&
        typeof defaultObj === 'object' &&
        'properties' in defaultObj
      ) {
        const properties = defaultObj.properties as Record<
          string,
          Record<string, unknown>
        >

        // 为每个属性创建可选项
        Object.entries(properties).forEach(([propName, propSchema]) => {
          // 从 schema 中确定属性类型
          let propType: StateVariable['type'] = 'string'
          switch (propSchema.type) {
            case 'string':
              propType = 'string'
              break
            case 'number':
              propType = 'number'
              break
            case 'boolean':
              propType = 'boolean'
              break
            case 'array':
              propType = 'array'
              break
            case 'object':
              propType = 'object'
              break
          }

          flattened.push({
            id: `${variable.id}.${propName}`,
            name: propName,
            type: propType,
            default: propSchema.default as StateVariable['default'],
            fullPath: `${variable.name}.${propName}`,
            displayName: propName,
            parentName: variable.name,
          })
        })
      }
    }
  })

  return flattened
}
```

### 3. 使用扁平化变量

在组件中：

```typescript
// 获取原始状态变量
const originalStateVariables = useMemo(() => {
  if (!startNode) return []
  const startConfig = startNode.data?.config as StartConfig
  return startConfig?.state_vars || []
}, [startNode])

// 获取扁平化后的状态变量（包括 object 的子属性）
const stateVariables = useMemo(() => {
  return flattenStateVariables(originalStateVariables)
}, [originalStateVariables])
```

### 4. 下拉框实现

使用 `fullPath` 作为选项值，确保能正确标识嵌套属性。嵌套属性使用缩进显示：

```typescript
<FormSelect
  value={assignment.name || ''}
  onValueChange={(value) => {
    if (value === '__add_variable__') {
      setShowAddVariable(true)
      return
    }
    handleVariableNameChange(index, value) // value 是 fullPath
  }}
>
  <FormSelectTrigger>
    {assignment.name ? (
      (() => {
        const selectedVar = stateVariables.find(
          (v) => v.fullPath === assignment.name
        )
        if (!selectedVar) return <FormSelectValue />
        return <VariableItem variable={selectedVar} />
      })()
    ) : (
      <FormSelectValue placeholder="Select" />
    )}
  </FormSelectTrigger>
  <FormSelectContent>
    {stateVariables.map((variable) => (
      <FormSelectItem key={variable.id} value={variable.fullPath}>
        {/* 嵌套属性添加左侧缩进 */}
        <div className={variable.parentName ? 'pl-4' : ''}>
          <VariableItem variable={variable} />
        </div>
      </FormSelectItem>
    ))}
  </FormSelectContent>
</FormSelect>
```

**缩进规则：**

- 顶层变量（如 `obj`, `str`）：无缩进
- 嵌套属性（如 `attr1`, `attr2`）：添加 `pl-4`（1rem / 16px）左侧内边距

### 5. 赋值处理

`handleVariableNameChange` 函数使用完整路径存储变量名：

```typescript
const handleVariableNameChange = (index: number, fullPath: string) => {
  const newAssignments = [...config.assignments]
  newAssignments[index] = {
    ...newAssignments[index],
    name: fullPath, // 存储完整路径，如 "obj.attr1" 或 "str"
  }
  onChange({
    ...config,
    assignments: newAssignments,
  })
}
```

## 示例

### Start 节点配置

```json
{
  "state_vars": [
    {
      "id": "obj",
      "name": "obj",
      "type": "object",
      "default": {
        "properties": {
          "attr1": { "type": "string", "default": "" },
          "attr2": { "type": "string" }
        }
      }
    },
    {
      "id": "str",
      "name": "str",
      "type": "string",
      "default": "test"
    }
  ]
}
```

### 扁平化后的变量列表

```typescript
;[
  {
    id: 'obj',
    name: 'obj',
    type: 'object',
    fullPath: 'obj',
    displayName: 'obj',
  },
  {
    id: 'obj.attr1',
    name: 'attr1',
    type: 'string',
    fullPath: 'obj.attr1',
    displayName: 'attr1',
    parentName: 'obj',
    default: '',
  },
  {
    id: 'obj.attr2',
    name: 'attr2',
    type: 'string',
    fullPath: 'obj.attr2',
    displayName: 'attr2',
    parentName: 'obj',
  },
  {
    id: 'str',
    name: 'str',
    type: 'string',
    fullPath: 'str',
    displayName: 'str',
    default: 'test',
  },
]
```

### Set State 节点配置

选择 `attr1` 后：

```json
{
  "assignments": [
    {
      "expression": {
        "expression": "workflow.input_as_text",
        "format": "cel"
      },
      "name": "obj.attr1" // 完整路径
    }
  ]
}
```

## 下拉框显示效果

下拉框中会显示（带缩进层级）：

```
┌─────────────────────────────────┐
│ obj                    OBJECT   │  ← 顶层变量
│     attr1              STRING   │  ← 嵌套属性（有缩进）
│     attr2              STRING   │  ← 嵌套属性（有缩进）
│ str                    STRING   │  ← 顶层变量
│ num                    NUMBER   │  ← 顶层变量
│ flag                   BOOLEAN  │  ← 顶层变量
│ list                   ARRAY    │  ← 顶层变量
├─────────────────────────────────┤
│ ➕ Add variable                 │
└─────────────────────────────────┘
```

**视觉层次：**

- 顶层变量无缩进
- 嵌套属性向右缩进 1rem（16px），清晰展示层级关系

## 类型安全

- 使用 `Record<string, unknown>` 替代 `any` 避免类型错误
- 使用类型断言确保 `default` 值符合 `StateVariable['default']` 类型
- 使用 `StateVariable['type']` 确保类型值有效

## 技术细节

### JSON Schema 检测

通过检查 `variable.default` 是否包含 `properties` 字段来判断是否为 JSON Schema：

```typescript
if (
  defaultObj &&
  typeof defaultObj === 'object' &&
  'properties' in defaultObj
) {
  // 这是一个 JSON Schema，展开 properties
}
```

### 路径命名约定

- 顶层变量：直接使用变量名，如 `"str"`
- 嵌套属性：使用点号分隔，如 `"obj.attr1"`

## UI/UX 改进

### 缩进显示

嵌套属性使用左侧缩进来体现层级关系：

```typescript
<div className={variable.parentName ? 'pl-4' : ''}>
  <VariableItem variable={variable} />
</div>
```

- **顶层变量**：`className=""` （无缩进）
- **嵌套属性**：`className="pl-4"` （16px 左侧内边距）

这种视觉设计让用户可以清楚地看到：

- 哪些是独立的变量
- 哪些是某个 object 的子属性

## 兼容性

- ✅ 兼容原有的简单类型变量（string, number, boolean, array）
- ✅ 支持 object 类型的子属性展开
- ✅ 嵌套属性使用缩进显示，清晰展示层级
- ✅ 保持与 OpenAI AgentBuilder 的行为一致

## 未来扩展

可能的扩展方向：

1. **多层嵌套**：支持 `obj.nested.deep.property`
2. **数组项访问**：支持 `list[0]` 或 `list.*`
3. **类型验证**：根据子属性类型验证表达式
4. **智能提示**：在表达式输入时提供变量路径提示

## 相关文件

- `app/(canvas)/agent-builder/edit/components/form-nodes/set-state-config.tsx` - Set State 配置表单
- `lib/nodes/definitions/set-state-node.tsx` - Set State 节点定义
- `lib/nodes/definitions/start-node.tsx` - Start 节点定义（StateVariable 类型）
- `lib/export/export-workflow.ts` - Workflow 导出逻辑（JSON Schema 生成）

## 版本信息

- **版本**: v1.3.1
- **日期**: 2025-10-20
- **作者**: AI Assistant

### 更新日志

- **v1.3.1** (2025-10-20)
  - 添加嵌套属性的缩进显示，提升视觉层次感
  - 使用 `pl-4` (16px) 左侧内边距区分顶层变量和嵌套属性

- **v1.3.0** (2025-10-20)
  - 初始实现 Object 类型变量的子属性展开和选择

## 参考资料

- [SET-STATE-VARIABLE-SELECTOR.md](./SET-STATE-VARIABLE-SELECTOR.md) - To variable 下拉选择器文档
- [NODE-SET-STATE.md](./NODE-SET-STATE.md) - Set State 节点文档
- [OpenAI AgentBuilder](https://platform.openai.com/agent-builder) - 参考实现
