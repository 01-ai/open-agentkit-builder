# OpenAI AgentBuilder 结构分析

> 基于从 OpenAI AgentBuilder 导出的真实 JSON 配置分析

## 📊 整体架构

### 工作流顶层结构

```typescript
interface Workflow {
  id: string // 工作流唯一ID
  object: 'workflow' // 对象类型
  created_at: number // 创建时间戳
  creator_user_id: string // 创建者ID

  // === 核心数据 ===
  nodes: Node[] // 节点数组
  edges: Edge[] // 连线数组
  start_node_id: string // 起始节点ID

  // === Schema 定义 ===
  input_variable_json_schema: JSONSchema // 输入变量Schema
  state_variable_json_schema: JSONSchema // 状态变量Schema

  // === UI 元数据 ===
  ui_metadata: UIMetadata // UI相关数据（位置、尺寸等）

  // === 其他 ===
  label: string // 工作流标签
  name: string // 工作流名称
  workflow_type: 'chat' // 工作流类型
  version: 'draft' | string // 版本
}
```

## 🎯 节点系统设计

### 1. 节点基础结构

```typescript
interface Node {
  id: string // 节点ID，如 "node_jn2x1lnf"
  label: string // 显示标签，如 "Web research agent"
  node_type: string // 节点类型，如 "builtins.Agent"

  config: NodeConfig // 节点配置（不同类型节点不同）
  input_schema: InputSchema // 输入Schema定义
}
```

### 2. 节点类型

从示例中可以看到：

| 节点类型 | node_type        | 说明                   |
| -------- | ---------------- | ---------------------- |
| Start    | `builtins.Start` | 工作流起始节点         |
| Agent    | `builtins.Agent` | AI 代理节点            |
| Note     | `note` (UI节点)  | 注释节点（不参与执行） |

从截图中还看到：

- **If / else** (`builtins.IfElse`) - 条件分支，有多个条件输出
- Guardrails（护栏）- 有 Pass/Fail 输出
- While（循环）
- User approval（用户审批）
- Transform（转换）
- Set state（设置状态）
- MCP（工具集成）
- File search（文件搜索）

### 3. If/Else 节点配置详解

> 🔥 **重要：** 已完全复刻实现，详见 [NODE-IF-ELSE.md](./NODE-IF-ELSE.md)

#### 基础结构

```typescript
interface IfElseNode {
  id: string
  label: string
  node_type: 'builtins.IfElse'
  config: {
    cases: IfElseCase[]
    fallback: {
      label: string
      output_port_id: string
    }
  }
}

interface IfElseCase {
  label: string // 系统标识符，导出时规范化为 case-0, case-1, ...
  output_port_id: string // 输出端口ID，与 label 一致
  predicate: {
    expression: string // CEL 条件表达式
    format: 'cel'
  }
}
```

#### 示例配置

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
          "expression": "input > 0",
          "format": "cel"
        }
      },
      {
        "label": "case-1",
        "output_port_id": "case-1",
        "predicate": {
          "expression": "input < 0",
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

#### UI Metadata 数据分离

**关键设计：** OpenAI 使用 `ui_metadata.dataByNodeId` 存储用户自定义的分支名称：

```json
{
  "ui_metadata": {
    "dataByNodeId": {
      "node_c2g0pa4g": {
        "caseNames": ["Valid Input", "Invalid Input"]
      }
    }
  }
}
```

**数据流转逻辑：**

1. **Canvas 编辑**: `config.cases[].label` 存储用户输入
2. **Export 导出**:
   - `label` 保存到 `ui_metadata.caseNames`
   - `config.cases[].label` 规范化为 `case-{index}`
3. **Import 导入**:
   - 从 `ui_metadata.caseNames` 恢复到 `config.cases[].label`

#### Branch 显示优先级

画布上的分支标签按以下优先级显示：

```
1. Case name 有值 → 显示 Case name
2. 否则 Condition 有值 → 显示 Condition 表达式
3. 否则 → 显示空字符串

特殊：Fallback 分支永远显示 "Else"
```

| Case name | Condition   | 显示结果        |
| --------- | ----------- | --------------- |
| "Valid"   | "input > 0" | **"Valid"**     |
| ""        | "input > 0" | **"input > 0"** |
| ""        | ""          | **""** (空)     |

#### 关键特性

- ✅ 支持多个条件分支（If / Else if / Else if / ...）
- ✅ 每个分支可选自定义名称（Case name）
- ✅ 每个分支必需条件表达式（Condition）
- ✅ 必有一个 Fallback 分支（永远显示为 "Else"）
- ✅ 使用 CEL (Common Expression Language)
- ✅ 数据分离设计（config vs ui_metadata）

### 4. Agent 节点配置详解

```typescript
interface AgentConfig {
  // === 核心配置 ===
  instructions: {
    expression: string // CEL表达式，如 "\"You are...\""
    format: 'cel'
  }

  model: {
    expression: string // 模型选择，如 "\"gpt-5-mini\""
    format: 'cel'
  }

  // === 消息和历史 ===
  messages: Message[] // 预设消息
  reads_from_history: boolean // 是否读取历史
  writes_to_history: boolean // 是否写入历史

  // === 推理配置 ===
  reasoning: {
    effort: 'low' | 'minimal' | 'medium' | 'high' // 推理强度
    summary: string | null
  }

  // === 输出格式 ===
  text: {
    format: {
      name: string // Schema名称
      schema: JSONSchema // JSON Schema定义
      type: 'json_schema'
      strict: boolean // 是否严格模式
    }
    verbosity: 'low' | 'medium' | 'high'
  }

  // === 工具和变量 ===
  tools: Tool[] // 可用工具列表
  variable_mapping: VariableMapping[] // 变量映射

  // === Widget配置（可选）===
  widget_config?: {
    widget_data_schema: JSONSchema // Widget数据Schema
    widget_template: string // Widget模板（JSON字符串）
  }

  // === 其他 ===
  user_visible: boolean // 是否用户可见
  hidden_properties: any | null // 隐藏属性
}
```

**关键发现：**

- 🔥 **CEL 表达式**：所有动态值都用 CEL (Common Expression Language) 表达式
- 🔥 **JSON Schema 驱动**：输入输出都通过 JSON Schema 严格定义
- 🔥 **Widget 系统**：支持自定义 UI 组件展示结果

## 🔗 连线（Edge）系统

### 连线结构

```typescript
interface Edge {
  id: string // 连线ID
  source_node_id: string // 源节点ID
  source_port_id: string // 源端口ID ⭐️
  target_node_id: string // 目标节点ID
  target_port_id: string // 目标端口ID ⭐️
}
```

**示例：**

```json
{
  "id": "edge_1bd497ad",
  "source_node_id": "node_g9yd4vbm",
  "source_port_id": "out", // 输出端口
  "target_node_id": "node_jn2x1lnf",
  "target_port_id": "in" // 输入端口
}
```

### 端口（Port）系统

从数据分析，端口类型有：

**标准端口：**

- `in` - 默认输入
- `out` - 默认输出
- `on_result` - 结果输出

**条件端口（从截图）：**

- Guardrails: `Pass`, `Fail`
- Condition: `1`, `Else` (可能还有 `2`, `3` 等)

**关键设计：**

- ✅ 端口是**命名**的，不是简单的 index
- ✅ 每个端口有明确的**语义**
- ✅ 一个节点可以有**多个输出端口**

## 🎨 UI 元数据系统

### UI Metadata 结构

```typescript
interface UIMetadata {
  // === 节点位置 ===
  positionsByNodeId: {
    [nodeId: string]: {
      x: number
      y: number
    }
  }

  // === UI专用节点（如Note） ===
  uiNodes: UINode[]

  // === 节点额外数据 ===
  dataByNodeId: {
    [nodeId: string]: {
      widgetFile?: WidgetFile // Widget文件信息
      widgetTools?: Tool[] // Widget工具
    }
  }

  // === 节点尺寸 ===
  dimensionsByNodeId: {
    [nodeId: string]: {
      width?: number
      height?: number
    }
  }

  // === 草稿数据 ===
  draft: Record<string, any>
}
```

### UI 节点（Note）

```typescript
interface UINode {
  id: string
  type: 'note' // UI节点类型
  data: {
    name: string | null
    text: string // 注释文本
    userDefinedPassthroughVariables: any[]
  }
}
```

**Note 节点特点：**

- 📝 纯 UI 节点，**不参与工作流执行**
- 📝 用于添加**说明文档**和**提示**
- 📝 存储在 `ui_metadata.uiNodes` 中，不在主 `nodes` 数组

## 🔥 核心设计亮点

### 1. CEL 表达式系统

所有动态值都使用 CEL 表达式：

```json
{
  "instructions": {
    "expression": "\"You are a helpful assistant...\"",
    "format": "cel"
  },
  "model": {
    "expression": "\"gpt-5-mini\"",
    "format": "cel"
  }
}
```

**优势：**

- ✅ 支持动态计算
- ✅ 可以引用变量
- ✅ 统一的表达式语言
- ✅ 安全沙箱执行

### 2. JSON Schema 驱动

**输入 Schema：**

```json
{
  "input_schema": {
    "name": "input",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  }
}
```

**输出格式 Schema：**

```json
{
  "text": {
    "format": {
      "name": "company_info_marketing_batch",
      "schema": {
        "type": "object",
        "properties": {
          "companies": { ... }
        }
      },
      "type": "json_schema",
      "strict": true
    }
  }
}
```

**优势：**

- ✅ 类型安全
- ✅ 自动验证
- ✅ 可视化生成表单
- ✅ 文档即代码

### 3. Widget 系统

支持自定义 UI 组件展示结果：

```json
{
  "widget_config": {
    "widget_data_schema": { ... },
    "widget_template": "{\"type\":\"Card\",\"children\":[...]}"
  }
}
```

**Widget 模板语法：**

```json
{
  "type": "Card",
  "size": "lg",
  "children": [
    {
      "type": "Row",
      "children": [
        { "type": "Text", "value": "Company Name" },
        { "type": "Text", "value": "{{ company_name }}" }
      ]
    }
  ]
}
```

使用类似 Jinja2 的模板语法绑定数据。

### 4. 命名端口（Named Ports）

不同于简单的 input/output，OpenAI 使用命名端口：

```
Agent Node:
  ├─ in (input)
  └─ on_result (output)

Guardrails Node:
  ├─ in (input)
  ├─ Pass (output)
  └─ Fail (output)

Condition Node:
  ├─ in (input)
  ├─ 1 (output - condition 1)
  ├─ 2 (output - condition 2)
  └─ Else (output - default)
```

## 📋 对我们的启示

### 设计建议

1. **采用命名端口系统**
   - 每个端口有明确的 ID 和语义
   - 支持多输出端口
   - 端口定义在节点定义中

2. **JSON Schema 驱动表单**
   - 节点配置用 Schema 定义
   - 自动生成配置表单
   - 类型验证

3. **分离执行节点和 UI 节点**
   - 执行节点在 `nodes` 数组
   - UI 节点（如 Note）在 `ui_metadata.uiNodes`
   - 清晰的职责分离

4. **UI 元数据单独存储**
   - 位置、尺寸等 UI 数据独立
   - 便于版本控制和协作

5. **表达式系统**
   - 可以考虑支持简单的表达式（如模板字符串）
   - 或者先从静态值开始，逐步演进

### 数据结构对比

| 特性       | OpenAI      | 我们的设计 | 建议              |
| ---------- | ----------- | ---------- | ----------------- |
| 端口系统   | 命名端口    | 待实现     | ✅ 采用命名端口   |
| 配置格式   | CEL表达式   | 静态值     | 🔶 先静态，后动态 |
| Schema驱动 | JSON Schema | 待实现     | ✅ 采用 Schema    |
| UI节点     | 分离存储    | 待实现     | ✅ 分离 UI 节点   |
| Widget     | 支持        | 不需要     | ❌ 暂不实现       |

## 📝 下一步行动

基于这个分析，我们应该：

1. **扩展节点定义系统**
   - 添加命名端口支持
   - 每个端口定义 ID、label、dataType

2. **实现 Schema 系统**
   - 使用 JSON Schema 定义配置
   - 基于 Schema 生成表单

3. **UI 元数据分离**
   - 位置、尺寸等 UI 数据单独存储
   - 便于序列化和版本控制

4. **Note 节点实现**
   - 创建 UI 专用节点类型
   - 不参与工作流执行

---

**总结：** OpenAI 的设计非常成熟，核心是**Schema 驱动 + 命名端口 + 表达式系统**。我们可以吸收其精华，从简单开始，逐步演进。

## 📊 节点实现状态跟踪

| 节点类型          | node_type               | 实现状态    | UI 一致性   | 数据格式一致性 | 详细文档                                 | 最后更新   |
| ----------------- | ----------------------- | ----------- | ----------- | -------------- | ---------------------------------------- | ---------- |
| **Start**         | `builtins.Start`        | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | -                                        | 2024-10-11 |
| **Agent**         | `builtins.Agent`        | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | -                                        | 2024-10-11 |
| **If / else**     | `builtins.IfElse`       | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | [NODE-IF-ELSE.md](./NODE-IF-ELSE.md)     | 2024-10-16 |
| **End**           | `builtins.End`          | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | -                                        | 2024-10-11 |
| **Note**          | `note`                  | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | -                                        | 2024-10-11 |
| **Guardrails**    | `builtins.Guardrails`   | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |
| **While**         | `builtins.While`        | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |
| **User approval** | `builtins.UserApproval` | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |
| **Transform**     | `builtins.Transform`    | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |
| **Set state**     | `builtins.SetState`     | ✅ 已实现   | ✅ 完全一致 | ✅ 完全一致    | [NODE-SET-STATE.md](./NODE-SET-STATE.md) | 2025-10-20 |
| **MCP**           | `builtins.MCP`          | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |
| **File search**   | `builtins.FileSearch`   | 🚧 部分实现 | 🔶 待验证   | 🔶 待验证      | -                                        | -          |

**图例：**

- ✅ 已完成并验证
- 🚧 部分实现
- 🔶 待验证
- ❌ 未实现
- `-` 暂无

**节点文档命名规范：**

- 每个节点的详细文档应命名为 `NODE-{节点名称}.md`
- 例如：`NODE-IF-ELSE.md`, `NODE-GUARDRAILS.md`
- 文档应包含：数据格式、UI 逻辑、数据流转、实现细节、测试场景
