# Set State 节点 - Add Variable 定位修复

## 问题描述

在 Set State 节点的 "To variable" 下拉框中点击 "Add variable" 时，存在以下问题：

1. VariableConfig Popover 出现在浏览器窗口左上角
2. Popover 闪现后立即消失
3. 无法正常添加新变量

## 根本原因

原实现使用隐藏的 `button` 和 `ref` 来触发 VariableConfig：

```typescript
// 问题实现
<div className="hidden">
  <VariableConfig ...>
    <button ref={addVariableTriggerRef} />
  </VariableConfig>
</div>

// 通过 useEffect 触发点击
useEffect(() => {
  if (showAddVariable && addVariableTriggerRef.current) {
    addVariableTriggerRef.current.click()
    setShowAddVariable(false)
  }
}, [showAddVariable])
```

**问题分析：**

- 隐藏的 `button` 没有正确的定位上下文
- Popover 使用 `button` 的位置作为锚点，导致定位在左上角
- `useEffect` 和点击触发的时序问题导致 Popover 闪现

## 解决方案

### 1. 修改 VariableConfig 组件

添加受控的 `open` 状态支持，使其可以被外部控制：

```typescript
export function VariableConfig({
  variable,
  onSave,
  children,
  validation,
  open: controlledOpen,           // 新增：受控 open 状态
  onOpenChange: controlledOnOpenChange, // 新增：受控回调
}: {
  variable: StateVariable
  onSave: (variable: StateVariable) => void
  children?: React.ReactNode
  validation?: (name: string) => string | undefined
  open?: boolean                  // 新增
  onOpenChange?: (open: boolean) => void // 新增
}) {
  const [internalOpen, setInternalOpen] = useState(false)

  // 支持受控和非受控两种模式
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ... */}
    </Popover>
  )
}
```

**改进点：**

- ✅ 支持受控和非受控两种模式
- ✅ 保持向后兼容（现有使用方式不受影响）
- ✅ 外部可以完全控制 Popover 的打开/关闭

### 2. 修改 Set State 配置表单

使用状态跟踪哪个 assignment 正在添加变量，并在正确的位置渲染 VariableConfig：

```typescript
export function SetStateConfigForm({ config, onChange }: SetStateConfigProps) {
  // 跟踪哪个 assignment 正在添加变量
  const [addVariableOpen, setAddVariableOpen] = useState<number | null>(null)

  return (
    <div className="relative">
      <FormSelect
        onValueChange={(value) => {
          if (value === '__add_variable__') {
            // 延迟打开，确保 Select 完全关闭
            setTimeout(() => {
              setAddVariableOpen(index)
            }, 100)
            return
          }
          handleVariableNameChange(index, value)
        }}
      >
        {/* ... FormSelect content ... */}
      </FormSelect>

      {/* Add Variable Popover - 始终渲染，通过 visibility 控制显示 */}
      <div
        className="absolute top-full left-0 mt-1 pointer-events-none"
        style={{
          visibility: addVariableOpen === index ? 'visible' : 'hidden'
        }}
      >
        <VariableConfig
          variable={{
            id: `var_${Date.now()}`,
            name: '',
            type: 'string',
          }}
          onSave={(variable) => {
            handleAddNewVariable(variable)
            setAddVariableOpen(null) // 保存后关闭
          }}
          validation={validateAddVariableName}
          open={addVariableOpen === index} // 受控 open 状态
          onOpenChange={(open) => {
            if (!open) {
              setAddVariableOpen(null) // 关闭时重置
            }
          }}
        >
          {/* 最小尺寸触发器，定位在 Select 的左上角 */}
          <div className="w-px h-px pointer-events-auto" />
        </VariableConfig>
      </div>
    </div>
  )
}
```

**改进点：**

- ✅ 使用 `relative` 容器包裹 FormSelect 和 VariableConfig
- ✅ **使用 `visibility` 控制显示，而非条件渲染**
  - 组件始终存在于 DOM 中，避免卸载问题
  - `visibility: hidden` 时不可见但保持定位上下文
- ✅ **添加 100ms 延迟打开**
  - 确保 Select 完全关闭后再打开 Popover
  - 避免事件冲突
- ✅ 容器使用 `absolute top-full left-0 mt-1` 定位在 FormSelect 下方
- ✅ 容器使用 `pointer-events-none` 不干扰 FormSelect 的交互
- ✅ 触发器是最小尺寸（1px × 1px）且使用 `pointer-events-auto`
- ✅ 避免使用 `aria-hidden` 和 `tabIndex={-1}`，解决无障碍问题
- ✅ 使用受控状态精确控制 Popover 的打开时机

### 3. 移除旧代码

删除不再需要的代码：

```diff
- import { useEffect, useMemo, useRef, useState } from 'react'
+ import { useMemo, useState } from 'react'

- const [showAddVariable, setShowAddVariable] = useState(false)
- const addVariableTriggerRef = useRef<HTMLButtonElement>(null)
+ const [addVariableOpen, setAddVariableOpen] = useState<number | null>(null)

- // Trigger click on hidden button when showAddVariable changes
- useEffect(() => {
-   if (showAddVariable && addVariableTriggerRef.current) {
-     addVariableTriggerRef.current.click()
-     setShowAddVariable(false)
-   }
- }, [showAddVariable])

- {/* Hidden Add Variable Dialog */}
- <div className="hidden">
-   <VariableConfig ...>
-     <button ref={addVariableTriggerRef} />
-   </VariableConfig>
- </div>
```

## 技术细节

### Popover 定位原理

Radix UI 的 Popover 使用 `PopoverTrigger` 作为锚点来定位 `PopoverContent`：

```
┌───────────────────────────────────┐
│  FormSelect 容器 (relative)        │
│                                   │
│  ┌─────────────────────┐          │
│  │  FormSelect         │ ← 不被遮挡
│  └─────────────────────┘          │
│                                   │
│  ┌─────────────────────────┐      │
│  │ 容器 (top-full, mt-1)    │ ← 定位在 Select 下方
│  │ [1px触发器]             │ ← pointer-events-auto
│  └─────────────────────────┘      │
│         ↓                         │
│  ┌───────────────────────┐        │
│  │  Popover Content      │ ← 出现在 Select 下方
│  │  (添加变量表单)        │
│  └───────────────────────┘        │
└───────────────────────────────────┘
```

**关键点：**

- 容器使用 `absolute top-full` 定位在 FormSelect 底部
- `mt-1` 添加 4px 间距，避免紧贴
- 容器使用 `pointer-events-none`，不阻止 FormSelect 的点击
- 触发器很小（1px × 1px），不影响布局
- 触发器使用 `pointer-events-auto`，允许 Popover 正常工作
- Popover 出现在 FormSelect 下方，不会遮挡

### 状态管理

```typescript
// 状态含义
addVariableOpen: number | null

// null: 没有打开添加变量对话框
// index: 第 index 个 assignment 正在添加变量

// 判断是否打开
open={addVariableOpen === index}

// 只有对应的 assignment 会显示打开的 Popover
```

## 用户体验提升

### 修复前

1. 点击 "Add variable"
2. 下拉框关闭 ✅
3. Popover 出现在左上角 ❌
4. Popover 立即消失 ❌
5. 无法添加变量 ❌

### 修复后

1. 点击 "Add variable"
2. 下拉框关闭 ✅
3. Popover 出现在下拉框位置 ✅
4. Popover 稳定显示 ✅
5. 可以正常添加变量 ✅

## 代码质量改进

- ✅ 删除了 `useEffect` 和 `useRef`，减少了复杂度
- ✅ 使用受控组件模式，逻辑更清晰
- ✅ 更好的关注点分离（VariableConfig 支持两种模式）
- ✅ 更好的类型安全（移除了 `any` 类型）

## 兼容性

- ✅ VariableConfig 保持向后兼容
- ✅ Start 节点中的 VariableConfig 使用不受影响（非受控模式）
- ✅ Set State 节点使用受控模式

## 测试要点

### 基本功能测试

1. 点击 "Add variable" → Popover 应出现在下拉框位置
2. 填写变量信息并保存 → 新变量应添加到 Start 节点
3. 新变量应立即出现在下拉列表中
4. 关闭 Popover（点击外部或取消）→ Popover 应正常关闭

### 多 Assignment 测试

1. 添加多个 assignment
2. 在不同的 assignment 中点击 "Add variable"
3. Popover 应始终定位在对应的下拉框位置

### 边界情况测试

1. 验证失败（重名、无效格式）→ Popover 应保持打开并显示错误
2. ESC 键关闭 → Popover 应正常关闭
3. 点击外部区域 → Popover 应正常关闭

## 相关文件

- `app/(canvas)/agent-builder/edit/components/form-nodes/set-state-config.tsx` - Set State 配置表单
- `app/(canvas)/agent-builder/edit/components/form-nodes/components/variable-config.tsx` - 变量配置组件
- `app/(canvas)/agent-builder/edit/components/form-nodes/start-config.tsx` - Start 节点配置（参考）

## 已知问题与修复

### 问题 1：FormSelect 无法点击（v1.3.2 初版）

**问题描述：**

- 触发器使用 `absolute inset-0` 覆盖整个 FormSelect
- 设置了 `aria-hidden="true"`，导致焦点冲突
- 浏览器报错：`Blocked aria-hidden on an element because its descendant retained focus`

**解决方案（v1.3.3）：**

1. 使用条件渲染，仅在需要时渲染 VariableConfig
2. 容器使用 `pointer-events-none`，不阻止 FormSelect 交互
3. 触发器改为最小尺寸（1px × 1px）且使用 `pointer-events-auto`
4. 移除 `aria-hidden` 和 `tabIndex={-1}`，解决无障碍问题

### 问题 2：Popover 立即关闭（v1.3.3）

**问题描述：**

- 点击 "Add variable" 后，Popover 出现但立即消失
- 控制台输出 `onOpenChange(false)`
- 条件渲染导致组件立即卸载或事件传播冲突

**解决方案（v1.3.4）：**

1. **改用 `visibility` 控制显示**

   ```typescript
   // 不使用条件渲染
   {addVariableOpen === index && <VariableConfig />}

   // 改用 visibility 控制
   <div style={{ visibility: addVariableOpen === index ? 'visible' : 'hidden' }}>
     <VariableConfig open={addVariableOpen === index} />
   </div>
   ```

   - 组件始终存在于 DOM 中，不会被卸载
   - 通过 `visibility` 和 `open` 状态控制显示

2. **添加延迟打开**

   ```typescript
   if (value === '__add_variable__') {
     // 延迟 100ms，确保 Select 完全关闭
     setTimeout(() => {
       setAddVariableOpen(index)
     }, 100)
     return
   }
   ```

   - 给 Select 时间完全关闭
   - 避免 Select 关闭事件与 Popover 打开事件冲突

## 版本信息

- **版本**: v1.3.4
- **日期**: 2025-10-20
- **作者**: AI Assistant

### 更新日志

- **v1.3.4** (2025-10-20)
  - 修复 Popover 立即关闭的问题
  - 改用 `visibility` 控制显示，避免条件渲染导致的卸载
  - 添加 100ms 延迟，避免 Select 关闭事件冲突
  - 调整 Popover 定位到 FormSelect 下方（`top-full`），避免遮挡

- **v1.3.3** (2025-10-20)
  - 修复 FormSelect 无法点击的问题
  - 使用 `pointer-events-none/auto` 策略
  - 移除 `aria-hidden`，解决无障碍警告

- **v1.3.2** (2025-10-20)
  - 初版实现，存在 FormSelect 无法点击的问题

## 参考资料

- [Radix UI Popover](https://www.radix-ui.com/primitives/docs/components/popover) - Popover 组件文档
- [SET-STATE-NESTED-VARIABLES.md](./SET-STATE-NESTED-VARIABLES.md) - 嵌套变量支持文档
- [SET-STATE-VARIABLE-SELECTOR.md](./SET-STATE-VARIABLE-SELECTOR.md) - To variable 下拉选择器文档
