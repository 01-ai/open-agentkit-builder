# Canvas 交互和目录结构重构

## 概述

本次重构解决了画布节点选中交互的问题，并优化了代码组织结构。

## 主要改进

### 1. 创建 CanvasProvider 上下文管理

**文件**: `app/(canvas)/agent-builder/edit/components/canvas/canvas-provider.tsx`

创建了一个全局的 Canvas Provider 来管理：

- 选中节点状态 (`selectedNodeId`)
- 节点和边数据 (`nodes`, `edges`)
- 辅助方法 (`getNode`, `updateNodeConfig`)

**优势**:

- 集中管理画布状态
- 任何组件都可以通过 `useCanvas()` hook 访问上下文
- 更容易维护和扩展

### 2. 修复失焦逻辑

**问题**: 之前在节点配置面板内操作（如下拉框）时，会触发 `clickOutside` 导致面板关闭。

**解决方案**:

- 移除了 `NodeConfigPanel` 中的 `clickOutside` 监听
- 在 `ReactFlow` 组件上添加 `onPaneClick` 事件处理
- **只有在点击画布空白区域时才会取消选中**
- 在配置面板内操作（表单、下拉框等）不会导致失焦

### 3. 节点选中视觉反馈

所有节点组件现在支持 `selected` 属性：

```tsx
interface NodeProps {
  id: string
  data: { ... }
  selected?: boolean  // 新增
}
```

**视觉效果**:

- 选中状态: 加深的边框颜色 + ring 高亮效果
- 未选中状态: 正常边框 + hover 效果
- 平滑的 transition 动画

**示例** (agent-node):

```tsx
className={`... ${
  selected
    ? 'border-blue-500 ring-2 ring-blue-500/20'
    : 'border-border hover:border-blue-300'
}`}
```

### 4. 目录结构重构

#### 新目录结构

```
app/(canvas)/agent-builder/edit/components/
├── canvas/
│   ├── canvas-provider.tsx      (新增 - 上下文管理)
│   ├── node-config-panel.tsx
│   ├── node-palette.tsx
│   └── use-node-operations.ts
├── canvas.tsx
├── ui-nodes/                     (新增 - 节点UI组件)
│   ├── index.tsx
│   ├── agent-node.tsx
│   ├── start-node.tsx
│   ├── end-node.tsx
│   ├── note-node.tsx
│   ├── if-else-node.tsx
│   ├── while-node.tsx
│   ├── set-state-node.tsx
│   ├── user-approval-node.tsx
│   ├── transform-node.tsx
│   ├── mcp-node.tsx
│   ├── guardrails-node.tsx
│   └── file-search-node.tsx
└── form-nodes/                   (新增 - 配置表单组件)
    ├── index.tsx
    └── agent-config.tsx
```

#### 职责分离

**ui-nodes**:

- 画布上显示的节点 UI 组件
- 处理节点的视觉呈现
- 包含 Handle (连接点)

**form-nodes**:

- 节点配置表单组件
- 独立的表单逻辑
- 可以使用 `useCanvas()` 访问上下文

#### 配置组件的使用

节点定义文件 (`lib/nodes/definitions/`) 现在导入表单组件：

```tsx
import { AgentConfig } from '@/app/(canvas)/agent-builder/edit/components/form-nodes'

export const agentNodeDefinition: NodeDefinition = {
  // ...
  ConfigComponent: AgentConfig,
}
```

## 使用示例

### 在表单组件中使用 Canvas 上下文

```tsx
'use client'

import { useCanvas } from '../canvas/canvas-provider'

export function MyNodeConfig({ nodeId, config, onChange }: ConfigProps) {
  const { getNode, updateNodeConfig } = useCanvas()

  const currentNode = getNode(nodeId)

  // ... 表单实现
}
```

### 更新节点配置

```tsx
// 方式 1: 通过 props
onChange(newConfig)

// 方式 2: 通过 context
const { updateNodeConfig } = useCanvas()
updateNodeConfig(nodeId, newConfig)
```

## 技术细节

### Canvas Provider 实现

- 使用 React Context API
- 提供 `useCanvas` hook
- 初始化默认节点（start, agent）
- 管理节点和边的状态

### 节点选中状态传递

ReactFlow 自动将 `selected` 属性传递给节点组件：

```tsx
<ReactFlow
  nodes={nodes}
  nodeTypes={nodeTypes} // 包含所有节点组件
  onNodeClick={handleNodeClick}
  onPaneClick={handlePaneClick}
/>
```

当节点被选中时，ReactFlow 会自动设置 `selected={true}`。

### 失焦处理流程

1. 用户点击节点 → `onNodeClick` → 设置 `selectedNodeId`
2. 用户在配置面板操作 → 不触发任何事件
3. 用户点击画布空白区域 → `onPaneClick` → 清除 `selectedNodeId`

## 注意事项

1. **所有节点组件必须接受 `selected` 属性**
2. **表单组件现在可以独立开发和测试**
3. **使用 `useCanvas` hook 时，组件必须在 CanvasProvider 内部**
4. **节点类型映射在 `canvas.tsx` 中定义**

## 未来扩展

### 可能的优化方向

1. **批量节点选中**: 扩展 Provider 支持多选
2. **节点分组**: 添加分组管理功能
3. **撤销/重做**: 在 Provider 中集成历史记录
4. **实时协作**: 通过 Provider 同步状态

### 新增节点类型流程

1. 创建 UI 组件 (`ui-nodes/my-node.tsx`)
2. 创建配置表单 (`form-nodes/my-config.tsx`)
3. 创建节点定义 (`lib/nodes/definitions/my-node.tsx`)
4. 在 `ui-nodes/index.tsx` 中导出
5. 在 `form-nodes/index.tsx` 中导出
6. 在 `canvas.tsx` 的 `nodeTypes` 中注册

## 总结

本次重构提升了代码的可维护性和用户体验：

- ✅ 修复了表单操作时的失焦问题
- ✅ 添加了清晰的选中状态视觉反馈
- ✅ 建立了更好的代码组织结构
- ✅ 提供了灵活的上下文访问机制
