# Agent 变量命名规则

本文档详细说明了代码生成器中 Agent 节点的变量命名规则，包括 Agent 定义、结果变量、临时变量和对话历史等。

## 概述

Agent 节点在生成的 Python 代码中会创建多个变量，包括：

- Agent 定义变量（如 `agent`, `agent1`, `web_research_agent`）
- 临时结果变量（如 `agent_result_temp`, `agent_result_temp1`）
- 最终结果变量（如 `agent_result`, `agent_result1`）
- 对话历史变量（`conversation_history`）

## 命名规则

### 1. Agent 定义变量

Agent 定义变量的命名基于节点的 `label` 属性：

#### 默认 Label "Agent"

- **第一个使用默认 label 的 Agent**：`agent`
- **后续使用默认 label 的 Agent**：`agent1`, `agent2`, `agent3` 等
- **智能跳过冲突**：如果某个数字已被自定义 label 占用，则自动跳过该数字

**示例：**

```python
# 工作流中有 4 个 Agent 节点：
# 1. label="Agent" -> agent
# 2. label="Agent2" -> agent2
# 3. label="Agent" -> agent1 (跳过 agent2，因为已被占用)
# 4. label="Agent" -> agent3

agent = Agent(name="Agent", ...)
agent2 = Agent(name="Agent2", ...)
agent1 = Agent(name="Agent", ...)
agent3 = Agent(name="Agent", ...)
```

#### 自定义 Label

自定义 label 直接转换为 snake_case 格式：

**示例：**

```python
# label="Web Research Agent" -> web_research_agent
# label="Data Analysis Agent" -> data_analysis_agent
# label="Agent2" -> agent2

web_research_agent = Agent(name="Web Research Agent", ...)
data_analysis_agent = Agent(name="Data Analysis Agent", ...)
agent2 = Agent(name="Agent2", ...)
```

### 2. 结果变量命名

结果变量包括临时变量和最终结果变量：

#### 默认 Label "Agent" 的结果变量

- **第一个 Agent**：
  - 临时变量：`agent_result_temp`
  - 最终结果：`agent_result`
- **后续 Agent**：
  - 临时变量：`agent_result_temp1`, `agent_result_temp2` 等
  - 最终结果：`agent_result1`, `agent_result2` 等

#### 自定义 Label 的结果变量

- 临时变量：`{agentVarName}_result_temp`
- 最终结果：`{agentVarName}_result`

**示例：**

```python
# 默认 label 的结果变量
agent_result_temp = await Runner.run(agent, ...)
agent_result = {"output_text": agent_result_temp.final_output_as(str)}

agent_result_temp1 = await Runner.run(agent1, ...)
agent_result1 = {"output_text": agent_result_temp1.final_output_as(str)}

# 自定义 label 的结果变量
web_research_agent_result_temp = await Runner.run(web_research_agent, ...)
web_research_agent_result = {"output_text": web_research_agent_result_temp.final_output_as(str)}
```

### 3. 对话历史变量

所有 Agent 共享同一个对话历史变量：

```python
conversation_history: list[TResponseInputItem] = [
    {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": workflow["input_as_text"]
            }
        ]
    }
]
```

每个 Agent 执行后，如果满足条件，会扩展对话历史：

```python
conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])
```

## 命名算法

### Agent 变量名生成算法

```typescript
function generateAgentVarName(
  label: string,
  index: number,
  allAgentLabels: string[]
): string {
  const snakeCase = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')

  if (snakeCase === 'agent') {
    // 计算前面有多少个默认 label
    let defaultLabelCount = 0
    for (let i = 0; i < index; i++) {
      if (allAgentLabels[i].toLowerCase() === 'agent') {
        defaultLabelCount++
      }
    }

    if (defaultLabelCount === 0) {
      return 'agent' // 第一个默认 label
    }

    // 查找可用数字，跳过被自定义 label 占用的
    let candidateNumber = defaultLabelCount
    const customAgentNames = allAgentLabels
      .filter((l) => l.toLowerCase() !== 'agent')
      .map((l) =>
        l
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
      )

    while (customAgentNames.includes(`agent${candidateNumber}`)) {
      candidateNumber++
    }

    return `agent${candidateNumber}`
  }

  // 自定义 label
  return snakeCase
}
```

### 结果变量名生成算法

```typescript
function generateResultVarName(
  agentVarName: string,
  isDefaultLabel: boolean,
  defaultLabelCount: number
): string {
  if (isDefaultLabel) {
    return `agent_result${defaultLabelCount > 0 ? defaultLabelCount : ''}`
  } else {
    return `${agentVarName}_result`
  }
}
```

## 实际示例

### 示例 1：多个默认 Label Agent

**输入：** 4 个 Agent 节点，都使用默认 label "Agent"

**生成代码：**

```python
agent = Agent(name="Agent", ...)
agent1 = Agent(name="Agent", ...)
agent2 = Agent(name="Agent", ...)
agent3 = Agent(name="Agent", ...)

# 主函数中的执行
agent_result_temp = await Runner.run(agent, ...)
agent_result = {"output_text": agent_result_temp.final_output_as(str)}

agent_result_temp1 = await Runner.run(agent1, ...)
agent_result1 = {"output_text": agent_result_temp1.final_output_as(str)}

agent_result_temp2 = await Runner.run(agent2, ...)
agent_result2 = {"output_text": agent_result_temp2.final_output_as(str)}

agent_result_temp3 = await Runner.run(agent3, ...)
agent_result3 = {"output_text": agent_result_temp3.final_output_as(str)}

return agent_result3
```

### 示例 2：混合 Label Agent

**输入：** 4 个 Agent 节点，label 分别为 "Agent", "Agent2", "Agent", "Agent"

**生成代码：**

```python
agent = Agent(name="Agent", ...)           # 第一个默认 label
agent2 = Agent(name="Agent2", ...)         # 自定义 label
agent1 = Agent(name="Agent", ...)          # 第二个默认 label，跳过 agent2
agent3 = Agent(name="Agent", ...)          # 第三个默认 label

# 主函数中的执行
agent_result_temp = await Runner.run(agent, ...)
agent_result = {"output_text": agent_result_temp.final_output_as(str)}

agent2_result_temp = await Runner.run(agent2, ...)
agent2_result = {"output_text": agent2_result_temp.final_output_as(str)}

agent_result_temp1 = await Runner.run(agent1, ...)
agent_result1 = {"output_text": agent_result_temp1.final_output_as(str)}

agent_result_temp3 = await Runner.run(agent3, ...)
agent_result3 = {"output_text": agent_result_temp3.final_output_as(str)}

return agent_result3
```

### 示例 3：自定义 Label Agent

**输入：** 2 个 Agent 节点，label 分别为 "Web Research Agent", "Data Analysis Agent"

**生成代码：**

```python
web_research_agent = Agent(name="Web Research Agent", ...)
data_analysis_agent = Agent(name="Data Analysis Agent", ...)

# 主函数中的执行
web_research_agent_result_temp = await Runner.run(web_research_agent, ...)
web_research_agent_result = {"output_text": web_research_agent_result_temp.final_output_as(str)}

data_analysis_agent_result_temp = await Runner.run(data_analysis_agent, ...)
data_analysis_agent_result = {"output_text": data_analysis_agent_result_temp.final_output_as(str)}

return data_analysis_agent_result
```

## 特殊情况

### 1. 单个 Agent

当工作流中只有一个 Agent 时：

- 默认 label：`agent`（不是 `agent1`）
- 结果变量：`agent_result_temp`, `agent_result`

### 2. 冲突处理

当自定义 label 与默认 label 的命名冲突时，默认 label 会跳过冲突的数字：

```python
# 假设有自定义 label "agent1"
agent = Agent(name="Agent", ...)      # 第一个默认
agent1 = Agent(name="agent1", ...)    # 自定义 label
agent2 = Agent(name="Agent", ...)     # 第二个默认，跳过 agent1，使用 agent2
```

### 3. 对话历史扩展条件

`conversation_history.extend()` 只在以下情况下添加：

1. 当前 Agent 后面还有其他 Agent 节点
2. 这是单个 Agent 工作流
3. 工作流中有 End 节点

## 实现位置

相关代码位于：

- `lib/code-generator.ts` - 主要的变量名生成逻辑
- `lib/generators/agent-code-generator.ts` - Agent 代码生成
- `tests/code-generator/core_nodes/agent/` - 相关测试用例

## 测试覆盖

所有命名规则都有对应的测试用例：

- `multiple_agents_default_labels` - 多个默认 label
- `multiple_agents_mixed_labels` - 混合 label（包括冲突处理）
- `multiple_agents` - 多个自定义 label
- `basic_agent_*` - 单个 Agent 的各种配置

这些测试确保命名规则的正确性和一致性。
