# Set State Variable Selector Enhancement

## 概述

重写了 Set State 节点的 "To variable" 下拉选择组件，完全对齐 OpenAI AgentBuilder 的显示样式和交互体验。

## 功能特性

### 1. **类型图标显示**

每个状态变量在下拉列表中都显示对应的类型图标：

| 类型    | 图标组件                                              |
| ------- | ----------------------------------------------------- |
| string  | `VariableTypeStringIcon`                              |
| number  | `VariableTypeNumberIcon`                              |
| boolean | `VariableTypeBooleanIcon`                             |
| object  | `VariableTypeObjectIcon`                              |
| array   | `VariableTypeArrayIcon` (别名 `VariableTypeListIcon`) |

### 2. **类型标签显示**

每个变量右侧显示类型标签（全大写）：

- STRING
- NUMBER
- BOOLEAN
- OBJECT
- ARRAY

### 3. **选中状态显示**

当选中某个变量后，SelectTrigger 显示：

```
[图标] variable_name        TYPE_LABEL
```

### 4. **"+ Add variable" 选项**

在下拉列表底部添加 "+ Add variable" 选项（当有可用变量时），点击后会：

- 打开添加变量对话框（使用 `VariableConfig` 组件）
- 新变量将被添加到 Start 节点的 State variables 中
- 添加成功后，新变量会自动出现在下拉列表中

### 5. **空状态处理**

当没有可用的状态变量时，显示：

```
No state variables available
```

## UI 结构

### SelectTrigger（选中状态显示）

```tsx
<SelectTrigger className="w-full">
  {assignment.name ? (
    (() => {
      const selectedVar = stateVariables.find((v) => v.name === assignment.name)
      if (!selectedVar) return <SelectValue />

      return <VariableItem variable={selectedVar} />
    })()
  ) : (
    <SelectValue placeholder="Select" />
  )}
</SelectTrigger>
```

### SelectContent（下拉列表项）

```tsx
<SelectContent>
  {stateVariables.length === 0 && (
    <div className="px-2 py-1.5 text-sm text-muted-foreground">
      No state variables available
    </div>
  )}
  {stateVariables.map((variable) => (
    <SelectItem key={variable.id} value={variable.name}>
      <VariableItem variable={variable} />
    </SelectItem>
  ))}

  {/* Add variable option */}
  {stateVariables.length > 0 && (
    <>
      <div className="h-px bg-border my-1" />
      <SelectItem value="__add_variable__">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Plus className="h-4 w-4" />
          <span>Add variable</span>
        </div>
      </SelectItem>
    </>
  )}
</SelectContent>
```

## 实现细节

### 使用 VariableItem 组件

复用 `VariableItem` 组件来显示变量信息，保持 UI 一致性：

```typescript
import { VariableItem } from './components/variable-item'
```

`VariableItem` 组件已经内置了：

- 类型图标显示（带颜色）
- 变量名显示
- 类型标签显示（小写）
- 默认值显示（可选）
- 编辑/删除按钮（可选）

### 数据来源

变量类型信息从 Start 节点的 `state_vars` 中获取：

```typescript
const { nodes, setNodes } = useCanvas()

const startNode = useMemo(() => {
  return nodes.find((n) => n.type === 'start')
}, [nodes])

const stateVariables = useMemo(() => {
  if (!startNode) return []

  const startConfig = startNode.data?.config as StartConfig
  return startConfig?.state_vars || []
}, [startNode])
```

每个 `StateVariable` 包含：

- `id`: 变量唯一ID
- `name`: 变量名称
- `type`: 变量类型 (`string` | `number` | `boolean` | `object` | `array`)
- `default`: 默认值（可选）

### 添加新变量

使用 `VariableConfig` 组件实现添加变量功能：

```typescript
const [showAddVariable, setShowAddVariable] = useState(false)
const addVariableTriggerRef = useRef<HTMLButtonElement>(null)

// 当 showAddVariable 变化时，自动触发隐藏按钮的点击
useEffect(() => {
  if (showAddVariable && addVariableTriggerRef.current) {
    addVariableTriggerRef.current.click()
    setShowAddVariable(false)
  }
}, [showAddVariable])

// 添加新变量到 Start 节点
const handleAddNewVariable = (variable: StateVariable) => {
  if (!startNode) return

  const startConfig = startNode.data?.config as StartConfig
  const newStateVars = [...(startConfig?.state_vars || []), variable]

  // 更新 Start 节点配置
  setNodes((nodes) =>
    nodes.map((node) =>
      node.id === startNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              config: {
                ...startConfig,
                state_vars: newStateVars,
              },
            },
          }
        : node
    )
  )
}

// 验证新变量名称
const validateAddVariableName = (name: string) => {
  if (!name) {
    return 'Name is required'
  }
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
    return 'Name must be alphanumeric and start with a letter'
  }
  if (stateVariables.some((v) => v.name === name)) {
    return 'Name already exists'
  }
  return undefined
}
```

在组件中渲染隐藏的 `VariableConfig`：

```tsx
{
  /* Hidden Add Variable Dialog (triggered by "+ Add variable" in dropdown) */
}
;<div className="hidden">
  <VariableConfig
    variable={{
      id: `var_${Date.now()}`,
      name: '',
      type: 'string',
    }}
    onSave={handleAddNewVariable}
    validation={validateAddVariableName}
  >
    <button ref={addVariableTriggerRef} />
  </VariableConfig>
</div>
```

## 修改的文件

### 1. `app/(canvas)/agent-builder/edit/components/form-nodes/set-state-config.tsx`

**v1.0.0 (类型显示)** - 已废弃，被 v1.2.0 重构替代

**v1.1.0 (添加变量功能)**

- ✅ 添加 `VariableConfig` 组件导入
- ✅ 使用 `useRef` 创建隐藏的触发按钮引用
- ✅ 实现 `handleAddNewVariable` 函数，更新 Start 节点的 state_vars
- ✅ 实现 `validateAddVariableName` 函数，验证变量名格式和重复
- ✅ 使用 `useEffect` 自动触发隐藏按钮点击
- ✅ 在 "+ Add variable" 点击时设置 `showAddVariable` 为 true

**v1.2.0 (代码重构 - 复用 VariableItem)** - 当前版本

- ✅ 删除自定义的 `getTypeIcon` 和 `getTypeLabel` helper functions
- ✅ 导入并复用 `VariableItem` 组件（来自 Start 节点）
- ✅ 在 `SelectTrigger` 中使用 `VariableItem` 显示选中变量
- ✅ 在 `SelectItem` 中使用 `VariableItem` 显示下拉选项
- ✅ 删除不需要的类型图标导入
- ✅ 保持与 Start 节点一致的 UI 风格
- ✅ 代码更简洁，减少重复逻辑

**重构前后对比：**

- 删除了 ~40 行的 helper functions 代码
- 删除了 ~20 行的自定义显示逻辑
- 使用标准的 `VariableItem` 组件，提高了可维护性

## 用户体验改进

### 之前

```
To variable:
[Select ▼]
  - obj
  - str
  - num
  - flag
  - list
```

### 现在

```
To variable:
[□ str     STRING ▼]

下拉选项：
  □ obj      OBJECT
  □ str      STRING
  □ num      NUMBER
  □ flag     BOOLEAN
  □ list     ARRAY
  ─────────────────
  + Add variable
```

## 待实现功能

### "+ Add variable" 交互

当用户点击 "+ Add variable" 时，可以实现以下功能之一：

1. **打开对话框**：允许用户直接在 Set State 节点中添加新变量
2. **导航到 Start 节点**：自动选中 Start 节点，引导用户添加变量
3. **内联添加表单**：在下拉框中展开一个快速添加表单

当前代码中预留了 TODO：

```typescript
onValueChange={(value) => {
  if (value === '__add_variable__') {
    // TODO: Open add variable dialog or navigate to Start node
    return
  }
  handleVariableNameChange(index, value)
}}
```

## 测试场景

### 场景 1：显示不同类型的变量

1. 在 Start 节点添加所有类型的变量（string, number, boolean, object, array）
2. 打开 Set State 节点
3. 点击 "To variable" 下拉框
4. **预期**：所有变量都显示对应的图标和类型标签

### 场景 2：选中变量

1. 在 Set State 节点选择一个变量（如 "str"）
2. **预期**：SelectTrigger 显示 string 图标 + "str" + "STRING" 标签

### 场景 3：无可用变量

1. 删除 Start 节点的所有状态变量
2. 打开 Set State 节点
3. **预期**：显示 "No state variables available"

### 场景 4：点击 "+ Add variable"

1. 点击下拉框中的 "+ Add variable"
2. **预期**：
   - 下拉框关闭
   - 弹出添加变量对话框
   - 可以输入变量名、选择类型、设置默认值
   - 保存后，新变量会添加到 Start 节点的 State variables 中
   - 新变量会自动出现在下拉列表中，可供选择

## 版本历史

| 版本  | 日期       | 说明                                                   |
| ----- | ---------- | ------------------------------------------------------ |
| 1.3.4 | 2025-10-20 | 修复 Popover 立即关闭问题，使用 visibility 控制显示    |
| 1.3.3 | 2025-10-20 | 修复 FormSelect 无法点击和无障碍警告问题               |
| 1.3.2 | 2025-10-20 | 修复 Add variable Popover 定位问题，确保正确显示位置   |
| 1.3.1 | 2025-10-20 | 添加嵌套属性缩进显示，提升视觉层次感                   |
| 1.3.0 | 2025-10-20 | 支持 Object 类型变量的子属性展开和选择（如 obj.attr1） |
| 1.2.0 | 2025-10-20 | 重构代码，复用 VariableItem 组件，简化实现             |
| 1.1.0 | 2025-10-20 | 实现 "+ Add variable" 功能，可直接添加新状态变量       |
| 1.0.0 | 2025-10-20 | 重写 To variable 下拉选择器，对齐 OpenAI UI            |

## 参考资料

- [SET-STATE-ADD-VARIABLE-FIX.md](./SET-STATE-ADD-VARIABLE-FIX.md) - Add Variable 定位修复文档
- [SET-STATE-NESTED-VARIABLES.md](./SET-STATE-NESTED-VARIABLES.md) - 嵌套变量支持文档
- [NODE-SET-STATE.md](./NODE-SET-STATE.md) - Set State 节点文档
- [OpenAI AgentBuilder](https://platform.openai.com/agent-builder) - 参考实现
