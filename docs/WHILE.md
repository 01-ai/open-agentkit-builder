# While 节点实现指南

While 节点是一个容器节点（父节点），可以包含其他节点并形成循环流程。本文档记录了 While 节点的实现细节和设计决策。

## ⚠️ 关键注意事项 - HANDLE ID 问题

**绝不能硬编码 Handle ID！** 使用 `lib/nodes/node-handles.ts` 中定义的函数来获取正确的 handle ID。

### Handle ID 必须与节点UI定义一致：
- `Agent`：输入 `in`，输出 `on_result`（不是 `out`！）
- `FileSearch`：输入 `in`，输出 `on_result`（不是 `out`！）
- `Transform`：输入 `in`，输出 `out`
- `SetState`：输入 `in`，输出 `out`
- `MCP`：输入 `in`，输出 `out`
- `Start`：输出 `out`
- `IfElse`：输入 `in`，多个输出来自 `config.cases[].output_port_id` 和 `config.fallback.output_port_id`
- `UserApproval`：输入 `in`，输出 `approval` 和 `reject`（不是 `out`！）
- `Guardrails`：输入 `in`，输出 `pass`、`error`（可选）、`fail`（可选）

### 使用正确的函数：
```typescript
import { getSourceHandles, getTargetHandle } from '@/lib/nodes/node-handles'

// 获取节点的所有输出 handle
const sourceHandles = getSourceHandles(nodeType, nodeConfig)

// 获取节点的输入 handle
const targetHandle = getTargetHandle(nodeType)
```

## ⚠️ 关键逻辑区分 - dummy-in 和自动连接

### Rule 1: dummy-in 边（根据 start_node_id 创建）
**文件：**
- `lib/export/import-workflow.ts`（导入时创建）
- `app/(canvas)/agent-builder/edit/components/canvas/use-parent-node.ts`（用户拖拽时创建）

- **只连接到 `start_node_id` 指向的节点**（永远不能连接其他节点！）
- 导入时：如果 While 的 `config.body.start_node_id` 存在，自动创建 dummy-in 边
- 拖拽时：当用户将第一个节点拖入空的 While 时，创建 dummy-in 边并更新 `start_node_id`
- 形式：`While.dummy-in → start_node.in`

### Rule 2: 自动连接未连接的源 handle（在导入时创建）
**文件：** `lib/export/import-workflow.ts`

- **在导入工作流时执行**
- 检查 While 内部每个节点的所有源 handle
- 如果某个源 handle 没有连接到其他内部节点，自动连接到 `While.out`
- 支持多输出节点（IfElse、UserApproval 等）
- 形式：`node.sourceHandle → While.out`

## 已实现的功能

### 1. 节点放置到 While 内部 ✅

**场景：**
- 从侧边栏拖拽新节点到 While 内
- 从画布上拖拽已有节点到 While 内

**实现细节：**

#### 1.1 侧边栏拖拽新节点
**文件：** `app/(canvas)/agent-builder/edit/components/canvas/use-node-operations.ts` - `onDrop` 函数

- 检查鼠标放下位置是否在某个 While 节点内
- 如果在 While 内，设置新节点的 `parentId` 为该 While 节点
- 将节点的绝对坐标转换为相对于 While 节点的相对坐标

```typescript
// 检查逻辑：
position.x >= whileNode.position.x &&
position.y >= whileNode.position.y &&
position.x <= whileNode.position.x + whileWidth &&
position.y <= whileNode.position.y + whileHeight
```

#### 1.2 拖拽已有节点到 While 内
**文件：** `app/(canvas)/agent-builder/edit/components/canvas/use-parent-node.ts` - `updateParentOnDrag` 函数

- 在 `onNodeDragStop` 时调用
- 检查节点是否完整地位于某个 While 节点内（使用 `isNodeCompletelyInside`）
- 节点必须完全包含在 While 内才能放入

### 2. 节点进入 While 时断开所有连线 ✅

**文件：** `app/(canvas)/agent-builder/edit/components/canvas/use-parent-node.ts` - `updateParentOnDrag` 函数

当节点的 `parentId` 发生变化时：
- 断开该节点的所有入边和出边
- 清理 edges 状态中相关的连接

```typescript
setEdges((eds) =>
  eds.filter((edge) => {
    const shouldRemove =
      edge.source === draggedNode.id || edge.target === draggedNode.id
    return !shouldRemove
  })
)
```

### 3. While 节点的 Handle 设计 ✅

**核心问题：**
React Flow 的 `connectionMode` 有以下限制：
- `Strict` 模式：只允许 source → target 连接
- `Loose` 模式：允许任意类型连接，**但不支持 target → target 连接**

While 节点需要满足两种连接模式：
1. 外部节点 → While → 外部节点（常规连接）
2. While ↔ 内部子节点（需要灵活的双向连接）

**最终方案：两个可见 Handle + 一个隐藏 Dummy Handle**

```
While 节点结构：
┌──────────────────────────┐
│        While Loop        │
├──────────────────────────┤
│  [dummy-in (hidden)]     │
│  [in visible]            │
│                          │
│  ┌────────────────────┐  │
│  │ Internal Nodes     │  │
│  └────────────────────┘  │
│                          │
│  [out visible]           │
└──────────────────────────┘

Handle 配置：
- in (type="target", visible) [位置：左侧]
  - 用途：接收外部节点的连接，也可连接内部子节点
  - 为什么是 target：符合常规的逻辑流向（输入）

- out (type="source", visible) [位置：右侧]
  - 用途：发送到外部节点，也可被内部子节点连接
  - 为什么是 source：符合常规的逻辑流向（输出）

- dummy-in (type="source", hidden) [位置：左侧，opacity: 0, pointerEvents: 'none']
  - 用途：临时接收内部子节点的输入连接
  - 为什么需要：React Flow 不支持 target-to-target 连接
  - 在 onConnect 时会被替换为真正的 handle ID
```

**实现细节：**

1. **while-node.tsx - Handle 渲染**
   ```typescript
   // 可见的外部 Handle
   <StandardHandle id="in" type="target" className="z-10" />
   <StandardHandle id="out" type="source" className="z-10" />

   // 隐藏的 dummy Handle，用于内部子节点的 target-to-target 连接
   // React Flow 不支持 target-to-target，所以用 dummy-in 作为 source
   // 在 onConnect 时会替换回正确的 handle
   <StandardHandle
     id="dummy-in"
     type="source"
     className="z-0 opacity-0 pointer-events-none"
     position={Position.Left}
   />
   ```

2. **canvas.tsx - connectionMode 配置**
   ```typescript
   <ReactFlow
     connectionMode={ConnectionMode.Loose}  // 允许灵活连接
     isValidConnection={(edge) => checkValidConnection(edge)}
   >
   ```

3. **canvas.tsx - isValidConnection 验证规则**
   ```typescript
   // While 与内部子节点的连接：允许任何组合
   if ((sourceIsWhile && targetIsChildOfSource) ||
       (targetIsWhile && sourceIsChildOfTarget)) {
     return true  // 允许连接，在 onConnect 时处理 handle 替换
   }
   ```

4. **canvas.tsx - onConnect 中的 Handle 替换**
   ```typescript
   // 当内部子节点通过 dummy-in 连接到 While 时
   // 将 dummy-in 替换为真正的 in handle
   if (targetIsWhile && sourceIsChildOfTarget &&
       connection.targetHandle === 'dummy-in') {
     finalConnection.targetHandle = 'in'
   }
   ```

**连接场景详解：**

| 场景 | 从 | 到 | 说明 |
|------|-----|-----|------|
| 外部输入 | external_node.out | While.in | 普通连接，in 是 target ✓ |
| 外部输出 | While.out | external_node.in | 普通连接，out 是 source ✓ |
| 内部输入 | While.in | child.in | 双向连接，需要 while 作为 source（由 in handle 充当） |
| 内部输出 | child.out | While.out | 双向连接，需要 while 作为 target（由 dummy-in 替换为 in） |

**为什么这个设计有效：**

1. ✅ **connectionMode="loose"** 允许不同类型的 handle 连接
2. ✅ **dummy-in** 解决 target-to-target 的限制
3. ✅ **onConnect 替换** 确保最终 edge 使用正确的 handle ID
4. ✅ **用户体验** 始终看到两个可见的 handle，无需复杂操作
5. ✅ **灵活扩展** 可以支持更复杂的连接模式

**相关文档：**
- React Flow connectionMode: https://reactflow.dev/api-reference/react-flow#connectionmode
- "A loose connection mode will allow you to connect handles with differing types, including source-to-source connections. However, it does not support target-to-target connections."



### 4. 第一个子节点自动连接 ✅

**文件：** `app/(canvas)/agent-builder/edit/components/canvas/use-parent-node.ts` - `updateParentOnDrag` 函数

当第一个节点被放入 While 时：
- 自动创建 While → child 的连接（`While.in -> child.in`）
- 自动创建 child → While 的连接（`child.out -> While.out`）

```typescript
if (childNodes.length === 1) {
  setEdges((eds) => {
    const newEdges = addEdge({
      id: `${newParentId}-in-${draggedNode.id}`,
      source: newParentId,
      sourceHandle: 'in',
      target: draggedNode.id,
      targetHandle: 'in',
    }, eds)
    return addEdge({
      id: `${draggedNode.id}-out-${newParentId}`,
      source: draggedNode.id,
      sourceHandle: 'out',
      target: newParentId,
      targetHandle: 'out',
    }, newEdges)
  })
}
```

### 5. Workflow 导入时重建 While 连线 ✅

**文件：** `app/(canvas)/agent-builder/edit/components/canvas.tsx` - CanvasContent 中的 useEffect

**说明：**
While 节点的内部连线（dummy-in 和 out）在导入时**不立即创建**，而是通过 Canvas 组件中的 useEffect 在节点被 React Flow 测量后再创建。这样可以避免 React Flow 找不到未测量 handle 的警告。

**核心逻辑：**

导入时只导入节点和拓扑结构中的边（比如子节点之间的连接），而自动添加的 While 内部连线在 Canvas 组件初始化后通过 effect 创建。

**为什么不在导入时创建这些边？**

React Flow 有一个重要的限制：当 edges 数组中包含引用未被测量的 handle 的边时，会产生警告：
```
[React Flow]: Couldn't create edge for source handle id: "out"...
```

这是因为：
1. 导入时创建的 edges 包含对 handle 的引用
2. 但此时节点还没有被 React Flow 测量（没有 `measured` 数据）
3. React Flow 无法找到这些 handle 并连接它们

**解决方案：延迟创建（Deferred Creation）**

在 Canvas 组件的 useEffect 中创建这些边的优点：
1. ✅ 节点已经被 React Flow 测量和渲染
2. ✅ connectionMode 和 isValidConnection 已经可用
3. ✅ Handle 数据已经完全初始化
4. ✅ 避免 React Flow 警告和边连接失败

**具体实现：** `canvas.tsx` 中的 useEffect

```typescript
useEffect(() => {
  if (!initialized.current || nodes.length === 0) return

  // 找到所有 While 节点及其子节点
  const whileNodes = nodes.filter((n) => n.type === 'while')
  const newEdgesToAdd: Edge[] = []

  whileNodes.forEach((whileNode) => {
    // Rule 1: 创建 dummy-in 边
    const startNodeId = whileNode.data.config?.body?.start_node_id
    if (startNodeId && !existingEdgeFor(whileNode.id, 'dummy-in')) {
      newEdgesToAdd.push({
        id: `${whileNode.id}-dummy-in-${startNodeId}`,
        source: whileNode.id,
        target: startNodeId,
        sourceHandle: 'dummy-in',
        targetHandle: 'in',
        type: 'while-inner-connecting',
      })
    }

    // Rule 2: 为所有内部节点创建 out 边（如果未连接到内部节点）
    internalNodes.forEach((node) => {
      // ... 遍历所有 source handle
      // 为未连接的 source handle 创建到 While.out 的边
    })
  })

  // 批量添加边
  if (newEdgesToAdd.length > 0) {
    setEdges((currentEdges) => [...currentEdges, ...newEdgesToAdd])
  }
}, [nodes, edges, setEdges])
```

## 未来需要实现的功能

### 6. 多个内部节点的自动连接

**目标：**
- 当将第二个及以后的节点放入 While 时，自动处理它们的连接
- 可能需要提供 UI 让用户选择如何连接新节点

**考虑方案：**
- 自动连接到前一个节点的输出
- 自动连接到 While 节点
- 由用户手动配置连接

### 7. 内部节点输出自动连接到 While 输出

**目标：** ✅ 已在导入时实现（Rule 2）

已在 `importWorkflowToCanvas` 中实现自动连接逻辑。用户通过交互删除的连线会在刷新时自动恢复。

### 8. start_node_id 的处理

**当前实现：** ✅ 已在导入时实现（Rule 1）

已在 `importWorkflowToCanvas` 中根据 `start_node_id` 自动创建 dummy-in 的连接。

### 9. While 节点嵌套

**目标：**
支持 While 节点嵌套在另一个 While 节点内

**当前支持状况：**
- `isNodeCompletelyInside` 可以处理任意级别的嵌套
- `updateParentOnDrag` 目前只检查直接的 While 父节点
- 连接验证需要考虑嵌套关系

**需要做的：**
- 测试嵌套 While 节点的连接验证
- 可能需要调整连接规则以支持嵌套场景

### 10. While 节点的条件表达式

**当前实现：**
- While 节点有 `config.condition` 字段，存储循环条件
- 但 UI 上可能没有配置条件的面板

**需要做的：**
- 确保 While 配置面板可以编辑 `condition.expression`
- 在导出时正确包含条件表达式

## 测试检查清单

### 基础功能
- [ ] 从侧边栏拖拽节点到 While 内
- [ ] 从画布拖拽节点到 While 内
- [ ] 拖拽节点在 While 内部移动（保持 parentId）
- [ ] 拖拽节点出 While 外（失去 parentId）
- [ ] 节点进入 While 时边被断开
- [ ] 第一个节点进入 While 时自动连接

### Handle 连接测试

**外部连接：**
- [ ] 外部节点.out → While.in（应该成功）
- [ ] While.out → 外部节点.in（应该成功）

**内部连接：**
- [ ] While.in → 内部子节点.in（应该成功）
- [ ] 内部子节点.out → While.out（应该成功）
- [ ] 内部子节点.out → While.in（可以连接到 dummy-in，替换为真实 in）

**无效连接：**
- [ ] While ↔ While（应该失败）
- [ ] 节点 → 自己（应该失败）
- [ ] 不同父节点的节点之间（应该失败）

### 高级功能
- [ ] 多个内部节点的连接
- [ ] While 嵌套（While 内嵌套 While）
- [ ] 导出包含正确的 While 配置
- [ ] 导入 While 工作流并还原连接
- [ ] dummy-in handle 在 edge 中被正确替换为 in
- [ ] 刷新页面后，dummy-in 和 out 连线自动重建
- [ ] 用户删除 dummy-in 或 out 连线，刷新后自动恢复
- [ ] 导入时重建的所有 While 内部连线使用 `type: 'while-inner-connecting'`
- [ ] 导入时重建的连线在画布上使用 `WhileInnerConnectingEdge` 样式正确渲染
- [ ] start_node_id 正确指向循环入口节点
- [ ] 导入时所有内部节点的 source handle 连接到 While.out
- [ ] 导入时没有连接到其他内部节点的 source handle 自动连接到 While.out
- [ ] 多输出节点（IfElse、UserApproval）的所有输出都自动连接到 While.out（如果未连接到内部节点）
- [ ] 已连接到内部节点的 source handle 不会被重复连接到 While.out

## 相关文件

### 核心实现文件
- `app/(canvas)/agent-builder/edit/components/ui-nodes/while-node.tsx` - While 节点 UI 组件
- `app/(canvas)/agent-builder/edit/components/canvas/use-parent-node.ts` - 父子节点管理
- `app/(canvas)/agent-builder/edit/components/canvas/use-node-operations.ts` - 节点操作（拖拽、放置）
- `app/(canvas)/agent-builder/edit/components/canvas.tsx` - Canvas 主组件（连接验证）
- `lib/nodes/definitions/while-node.tsx` - While 节点定义和配置
- `lib/export/export-workflow.ts` - 导出 workflow 到 OpenAI 格式
- `lib/export/import-workflow.ts` - ✅ 导入 workflow 并重建 While 连线（已实现）

### 相关类型定义
- `lib/nodes/definitions/while-node.tsx`:
  ```typescript
  export interface WhileConfig {
    condition: WhileCondition  // CEL 表达式
    body: WhileBody            // 嵌入的节点和边
  }

  export interface WhileBody {
    edges: any[]
    nodes: any[]
    start_node_id: string      // 循环入口节点
  }
  ```

## 设计决策

### 为什么使用两个可见 Handle + 一个隐藏 Dummy Handle？

**背景：**
React Flow 的 connectionMode 有一个重要限制：
- `Strict` 模式只允许 source → target
- `Loose` 模式允许任意类型连接，**但不支持 target → target**

While 节点需要支持：
1. 外部节点 ↔ While（标准连接）
2. While ↔ 内部子节点（需要 While 既做 target 又做 source）

**为什么不是 4 个 Handle？**
- 增加复杂度
- 难以维护
- 用户体验差（太多 handle）

**为什么是 2 个可见 + 1 个隐藏？**
1. **简洁**：用户只看到两个 handle（in 和 out）
2. **有效**：dummy-in 作为 source，解决 target-to-target 限制
3. **优雅**：在 onConnect 时自动替换，用户无感知
4. **易维护**：核心逻辑只需在 onConnect 中处理

### 为什么 While.in 是 target，而不是 source？

虽然 While 需要向内部子节点发送数据（作为 source），但：
1. **逻辑一致性**：While.in 代表"输入"，习惯上输入是 target
2. **外部连接兼容**：外部节点输出 → While.in（标准的 source → target）
3. **灵活性**：connectionMode="loose" 允许 While.in 也连接内部子节点
4. **dummy-in 补充**：用 dummy-in 解决 target-to-target 的技术限制

### 为什么断开进入 While 时的所有边？

根据原始需求，节点进入 While 时应该断开所有连线，这样可以：
1. 避免悬挂的连接
2. 强制用户重新设计内部流程
3. 简化状态管理

### 坐标系统的关键细节

**相对坐标 vs 绝对坐标：**

在 React Flow 中，子节点的 position 是**相对于父节点**的，而不是绝对画布坐标。

在 `isNodeCompletelyInside` 函数中，这个区别很关键：
```typescript
// 如果节点已经是某个父节点的子节点，其 position 是相对坐标
if (node.parentId === parentNode.id) {
  // 直接使用 position，它已经是相对的
  nodeX = node.position.x
  nodeY = node.position.y
} else {
  // 如果节点不是这个父节点的子节点，需要转换
  nodeX = node.position.x - parentNode.position.x
  nodeY = node.position.y - parentNode.position.y
}

// 然后检查是否在父节点的相对坐标范围内
const isInside =
  nodeX >= 0 &&
  nodeY >= 0 &&
  nodeRight <= parentWidth &&
  nodeBottom <= parentHeight
```

这确保了：
- 子节点在 While 内部拖拽时不会丢失 parentId
- 节点拖拽到 While 边界外时才会正确地失去父子关系

## 参考

- React Flow 文档：https://reactflow.dev/
- OpenAI AgentBuilder 设计
- 项目 AGENTS.md 中的技术选型说明
