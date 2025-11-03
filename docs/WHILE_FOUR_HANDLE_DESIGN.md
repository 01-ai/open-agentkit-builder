# While 节点四 Handle 设计方案（改进版）

## 问题背景

While 节点需要与两种不同的连接方式交互：

- **外部连接**：外部节点 ↔ While 节点
- **内部连接**：While 节点 ↔ 内部子节点

但 React Flow 的 Handle 类型（source/target）在渲染时就已确定，无法在连接时动态改变。

## 解决方案：可见外部 Handle + 隐藏内部 Handle 策略

### 核心思路（改进版）

将四个 Handle 分为两层：
- **可见层**：外部 Handle（用户交互）
- **隐藏层**：内部 Handle（内部替换）

用户始终与外部 Handle 交互，但在 `handleConnect` 时，当连接的是内部节点时，自动替换为内部 Handle。

```
While 节点 Handle 架构：

可见层（用户看到）：
├─ in-external (type="target", visible)
└─ out-external (type="source", visible)

隐藏层（内部使用）：
├─ in-internal (type="source", opacity: 0, pointerEvents: none)
└─ out-internal (type="target", opacity: 0, pointerEvents: none)

交互流程：
用户拖拽 out-external ──┐
                       ├─ 如果目标是外部节点 → 保持 out-external
                       └─ 如果目标是内部节点 → 替换为 out-internal
```

### 优势对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **四个都可见** | 清晰展示所有 Handle | 用户困惑，不知道选哪个 |
| **四个都透明** | 简化 UI，仅逻辑交互 | React Flow 可能无法正确捕获拖拽 |
| **外部可见，内部隐藏（当前）** | ✅ 用户体验好 ✅ 逻辑清晰 ✅ 易于维护 | 需要 onConnect 替换逻辑 |

## 实现步骤

### 第一步：渲染外部可见 + 内部隐藏的 Handle

**文件：** `app/(canvas)/agent-builder/edit/components/ui-nodes/while-node.tsx`

```typescript
{/* VISIBLE External handles */}
<StandardHandle id="in-external" type="target" />
<StandardHandle id="out-external" type="source" />

{/* HIDDEN Internal handles - stacked below */}
<StandardHandle
  id="in-internal"
  type="source"
  style={{ opacity: 0, pointerEvents: 'none' }}
/>
<StandardHandle
  id="out-internal"
  type="target"
  style={{ opacity: 0, pointerEvents: 'none' }}
/>
```

**关键点：**
- 外部 Handle 正常渲染（可见，可交互）
- 内部 Handle 隐藏（`opacity: 0, pointerEvents: 'none'`）
- 内部 Handle 在 HTML 中堆叠在外部 Handle 下方
- 用户只能与外部 Handle 交互

### 第二步：宽松的连接验证规则

**文件：** `app/(canvas)/agent-builder/edit/components/canvas.tsx` - `checkValidConnection`

允许外部 Handle 与任何合法对象连接：

```typescript
if (sourceIsWhile && !targetIsWhile) {
  if (targetIsChildOfSource) {
    // While -> 内部节点：允许 out-external，后面会替换为 out-internal
    return (
      (connection.sourceHandle === 'out-external' ||
        connection.sourceHandle === 'out-internal') &&
      (connection.targetHandle === 'in' || connection.targetHandle === 'out')
    )
  } else {
    // While -> 外部节点：只允许 out-external
    return (
      connection.sourceHandle === 'out-external' &&
      connection.targetHandle === 'in'
    )
  }
}

if (targetIsWhile && !sourceIsWhile) {
  if (sourceIsChildOfTarget) {
    // 内部节点 -> While：允许多种 targetHandle，后面会替换
    return (
      (connection.targetHandle === 'in-external' ||
        connection.targetHandle === 'in-internal' ||
        connection.targetHandle === 'out-internal') &&
      (connection.sourceHandle === 'in' || connection.sourceHandle === 'out')
    )
  } else {
    // 外部节点 -> While：只允许 in-external
    return (
      connection.sourceHandle !== 'in' &&
      connection.targetHandle === 'in-external'
    )
  }
}
```

### 第三步：在 onConnect 时替换 Handle

**文件：** `app/(canvas)/agent-builder/edit/components/canvas.tsx` - `handleConnect`

```typescript
const handleConnect = useCallback(
  (connection: Connection) => {
    let finalConnection = { ...connection }

    const sourceNode = nodes.find((n) => n.id === connection.source)
    const targetNode = nodes.find((n) => n.id === connection.target)

    if (!sourceNode || !targetNode) return

    const sourceIsWhile = sourceNode.type === 'while'
    const targetIsWhile = targetNode.type === 'while'
    const sourceIsChildOfTarget = sourceNode.parentId === connection.target
    const targetIsChildOfSource = targetNode.parentId === connection.source

    // While 作为 source：检查是否需要替换 out-external -> out-internal
    if (sourceIsWhile && targetIsChildOfSource) {
      if (connection.sourceHandle === 'out-external') {
        finalConnection.sourceHandle = 'out-internal'
      }
    }

    // While 作为 target：检查是否需要替换为 internal
    if (targetIsWhile && sourceIsChildOfTarget) {
      if (
        connection.targetHandle === 'in-external' ||
        connection.targetHandle === 'out-external'
      ) {
        // 根据 source handle 类型判断用哪个 internal handle
        if (connection.sourceHandle === 'out') {
          finalConnection.targetHandle = 'out-internal'
        } else if (connection.sourceHandle === 'in') {
          finalConnection.targetHandle = 'in-internal'
        }
      }
    }

    setEdges((eds) => addEdge(finalConnection, eds))
  },
  [nodes]
)
```

## 工作流程

### 用户操作流程

#### 场景 1：连接外部节点到 While

```
用户拖拽：external_node.out → While.left（可见的 in-external）

内部处理：
1. 拖拽开始 → isValidConnection 检查
   ✓ external_node.out 不是 'in'
   ✓ While.in-external 是 target
   → 允许

2. 拖拽结束 → handleConnect 被调用
   - sourceIsWhile = false, targetIsWhile = true
   - sourceIsChildOfTarget = false
   - targetHandle 已经是 'in-external'
   - ✓ 不需要替换，保持原样

3. 边创建完成
   - edge.targetHandle = 'in-external'
   - 线条从 external_node.out 连到 While.left 的 in-external

结果：✓ 连接成功
```

#### 场景 2：While 连接到内部节点

```
用户拖拽：While.right（可见的 out-external）→ internal_node.in

内部处理：
1. 拖拽开始 → isValidConnection 检查
   ✓ While.out-external 是 source
   ✓ internal_node.in 是 target
   ✓ internal_node.parentId === While.id
   → 允许

2. 拖拽结束 → handleConnect 被调用
   - sourceIsWhile = true, targetIsWhile = false
   - targetIsChildOfSource = true
   - connection.sourceHandle = 'out-external'
   - 替换：finalConnection.sourceHandle = 'out-internal'

3. 边创建完成
   - edge.sourceHandle = 'out-internal'
   - 线条从 While.right 的 out-internal 连到 internal_node.in

结果：✓ 连接成功，线条路径正确
```

#### 场景 3：内部节点连接到 While

```
用户拖拽：internal_node.out → While.right（可见的 out-external）

内部处理：
1. 拖拽开始 → isValidConnection 检查
   ✓ internal_node.out 是 source
   ✓ While.out-external 是 source（允许，因为 connectionMode=loose）
   ✓ internal_node.parentId === While.id
   → 允许

2. 拖拽结束 → handleConnect 被调用
   - sourceIsWhile = false, targetIsWhile = true
   - sourceIsChildOfTarget = true
   - connection.targetHandle = 'out-external'
   - connection.sourceHandle = 'out'
   - 替换：finalConnection.targetHandle = 'out-internal'

3. 边创建完成
   - edge.targetHandle = 'out-internal'
   - 线条从 internal_node.out 连到 While.right 的 out-internal

结果：✓ 连接成功，线条路径正确
```

## 技术细节

### Handle 的四个属性详解

| 属性 | in-external | in-internal | out-external | out-internal |
|------|------------|-----------|--------------|------------|
| 位置 | 左侧 | 左侧（下层） | 右侧 | 右侧（下层） |
| type | target | source | source | target |
| 用途 | 外部输入 | 循环输入 | 外部输出 | 循环输出 |
| 可见性 | 可见 | 不可见 | 可见 | 不可见 |
| pointerEvents | auto | none | auto | none |

### CSS 样式说明

```typescript
// 可见的外部 Handle
<StandardHandle id="in-external" type="target" />
// 默认样式使其完全可见

// 隐藏的内部 Handle
<StandardHandle
  id="in-internal"
  type="source"
  style={{ opacity: 0, pointerEvents: 'none' }}
/>
// opacity: 0 使其不可见
// pointerEvents: 'none' 禁止鼠标交互，让外部 handle 接收事件
```

### 为什么使用 pointerEvents: 'none'？

如果不使用 `pointerEvents: 'none'`：
- 隐藏的 Handle 仍会捕获鼠标事件
- 用户可能无意中连接到隐藏的 Handle
- 拖拽体验不稳定

使用 `pointerEvents: 'none'` 后：
- 隐藏的 Handle 对鼠标事件"透明"
- 用户只与可见的 Handle 交互
- React Flow 将拖拽事件传递给外部 Handle
- 稳定且可预测

### Handle 替换的时机

替换发生在 `handleConnect` 中，即连接已经被验证但还未持久化时：

```
验证阶段（isValidConnection）
    ↓
用户释放鼠标
    ↓
onConnect 回调
    ↓
Handle 替换（如果需要）
    ↓
边被添加到状态
    ↓
UI 重新渲染，显示正确的线条
```

这样可以确保：
1. 用户始终看到可见的 Handle
2. 最终的 edge 拥有正确的 Handle ID
3. 线条路径计算正确

## 优势对比

### vs 旧的四个都透明的方案

| 方面 | 旧方案 | 新方案 |
|------|------|------|
| **用户体验** | 不清晰 | 清晰，只看到两个 handle |
| **交互稳定性** | React Flow 可能困惑 | 明确，用户与外部 handle 交互 |
| **代码复杂度** | 中等 | 简化，逻辑更直观 |
| **调试难度** | 困难，4 个 handle 都需考虑 | 简单，主要关注替换逻辑 |

### vs 动态改变 Handle type 的方案

| 方面 | 动态方案 | 新方案 |
|------|---------|--------|
| **技术可行性** | React Flow 不支持 | ✓ 标准做法 |
| **实现难度** | 需要 hack React Flow | ✓ 使用 API 正常用法 |
| **可维护性** | 低，依赖框架内部 | ✓ 高，清晰的替换逻辑 |

## 测试检查清单

### 基础连接测试

- [ ] 外部节点 → While.left (in-external)
- [ ] While.right → 外部节点 (out-external)
- [ ] While.left → 内部节点 (最终为 in-internal)
- [ ] 内部节点 → While.right (最终为 out-internal)

### 线条渲染测试

- [ ] 所有连接的线条路径正确
- [ ] 没有线条折返或奇怪的弯曲
- [ ] 多个连接不会相互干扰
- [ ] 可拖拽线条和调整

### 编辑测试

- [ ] 删除连接后，handle 恢复可用
- [ ] 重新连接同一条边，handle ID 正确替换
- [ ] While 节点移动时，线条跟随正确

### 导出导入测试

- [ ] 导出包含正确的 handle ID（in-external, out-internal 等）
- [ ] 导入时能正确还原这些连接
- [ ] 页面刷新后连接仍然存在且正确

### 边界情况

- [ ] While ↔ While（应该拒绝）
- [ ] 节点 ↔ 自己（应该拒绝）
- [ ] 多个内部节点连接（应该都成功）
- [ ] While 嵌套（While 内嵌套 While）

## 参考资源

- React Flow 官方文档：https://reactflow.dev/
- Handle API：https://reactflow.dev/api-reference/types/handle
- Connection Rules：https://reactflow.dev/guides/custom-nodes
