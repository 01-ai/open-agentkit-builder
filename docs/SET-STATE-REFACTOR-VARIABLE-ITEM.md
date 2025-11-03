# Set State 节点 - VariableItem 组件复用重构

## 重构目标

将 Set State 节点的 "To variable" 下拉选择器重构为使用 `VariableItem` 组件，保持与 Start 节点的 UI 一致性。

## 重构内容

### 删除的代码

1. **Helper Functions**（~40 行）

   ```typescript
   // 删除
   function getTypeIcon(type: StateVariableType) { ... }
   function getTypeLabel(type: StateVariableType): string { ... }
   ```

2. **类型图标导入**

   ```typescript
   // 删除
   import {
     VariableTypeArrayIcon,
     VariableTypeBooleanIcon,
     VariableTypeNumberIcon,
     VariableTypeObjectIcon,
     VariableTypeStringIcon,
   } from '@/components/ui/icons'
   ```

3. **自定义 UI 代码**（~30 行）

   ```typescript
   // SelectTrigger 中的自定义显示逻辑
   <div className="flex items-center justify-between w-full">
     <div className="flex items-center gap-2">
       <TypeIcon className="h-4 w-4" />
       <span>{selectedVar.name}</span>
     </div>
     <span className="text-xs text-muted-foreground">
       {typeLabel}
     </span>
   </div>

   // SelectItem 中的自定义显示逻辑
   <div className="flex items-center justify-between w-full min-w-[200px]">
     <div className="flex items-center gap-2">
       <TypeIcon className="h-4 w-4" />
       <span>{variable.name}</span>
     </div>
     <span className="text-xs text-muted-foreground ml-4">
       {typeLabel}
     </span>
   </div>
   ```

### 新增的代码

1. **导入 VariableItem**

   ```typescript
   import { VariableItem } from './components/variable-item'
   ```

2. **简化的 SelectTrigger**

   ```typescript
   <SelectTrigger className="w-full">
     {assignment.name ? (
       (() => {
         const selectedVar = stateVariables.find(
           (v) => v.name === assignment.name
         )
         if (!selectedVar) return <SelectValue />

         return <VariableItem variable={selectedVar} />
       })()
     ) : (
       <SelectValue placeholder="Select" />
     )}
   </SelectTrigger>
   ```

3. **简化的 SelectContent**
   ```typescript
   {stateVariables.map((variable) => (
     <SelectItem key={variable.id} value={variable.name}>
       <VariableItem variable={variable} />
     </SelectItem>
   ))}
   ```

## 重构效果

### 代码质量提升

- ✅ 删除了 ~70 行重复代码
- ✅ 使用标准组件，提高可维护性
- ✅ 保持与 Start 节点的 UI 一致性
- ✅ 减少了类型图标的重复导入
- ✅ 简化了组件结构

### UI 一致性

- ✅ 图标样式与 Start 节点完全一致
- ✅ 类型标签显示与 Start 节点完全一致
- ✅ 布局和间距与 Start 节点完全一致

### 可维护性

- ✅ 如果需要修改变量显示样式，只需修改 `VariableItem` 组件
- ✅ 所有使用状态变量的地方都会自动同步更新
- ✅ 减少了代码重复，降低了维护成本

## VariableItem 组件特性

`VariableItem` 组件来自 `app/(canvas)/agent-builder/edit/components/form-nodes/components/variable-item.tsx`，提供了：

1. **类型图标显示**（带颜色）
   - `string` - 绿色
   - `number` - 蓝色
   - `boolean` - 橙色
   - `object` - 紫色
   - `array` - 粉色

2. **变量信息显示**
   - 变量名
   - 类型标签（小写）

3. **可选功能**（在 Set State 中未使用）
   - 默认值显示
   - 编辑按钮
   - 删除按钮

## 重构前后对比

### 重构前（v1.0.0 - v1.1.0）

- 有独立的 `getTypeIcon` 和 `getTypeLabel` 函数
- 直接导入所有类型图标组件
- 手动构建 UI 结构
- 代码行数：~320 行

### 重构后（v1.2.0）

- 复用 `VariableItem` 组件
- 只需导入一个组件
- 自动处理 UI 结构
- 代码行数：~250 行（减少了 ~70 行）

## 相关文件

- `app/(canvas)/agent-builder/edit/components/form-nodes/set-state-config.tsx` - Set State 配置表单
- `app/(canvas)/agent-builder/edit/components/form-nodes/components/variable-item.tsx` - 变量项组件
- `app/(canvas)/agent-builder/edit/components/form-nodes/start-config.tsx` - Start 节点配置（参考）

## 参考资料

- [SET-STATE-VARIABLE-SELECTOR.md](./SET-STATE-VARIABLE-SELECTOR.md) - To variable 下拉选择器文档
- [NODE-SET-STATE.md](./NODE-SET-STATE.md) - Set State 节点文档
- [OpenAI AgentBuilder](https://platform.openai.com/agent-builder) - 参考实现

## 版本信息

- **重构版本**: v1.2.0
- **日期**: 2025-10-20
- **作者**: AI Assistant
