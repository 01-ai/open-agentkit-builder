# Code Generator 测试用例目录结构

本目录包含代码生成器（code-generator）的测试用例，按照节点类型和功能复杂度组织，便于维护和扩展。

## 目录结构

### 核心节点 (core_nodes)

- **agent/**: Agent节点相关测试
  - **basic_agent/**: 基础Agent配置
    - `simple_instructions/`: 简单指令
    - `multi_instructions/`: 多指令
    - `default_instructions/`: 默认指令
  - **agent_with_tools/**: 带工具的Agent
    - `function_tool/`: 函数工具
    - `file_search/`: 文件搜索工具
    - `guardrails/`: 护栏工具
    - `mcp/`: MCP工具
  - **agent_with_output/**: 带输出格式的Agent
    - `json_schema/`: JSON Schema输出
    - `text_format/`: 文本格式输出
  - **agent_combinations/**: Agent组合配置
    - `tools_and_json_schema/`: 工具+JSON Schema
    - `multi_instructions_and_tools/`: 多指令+工具

- **end/**: End节点相关测试
  - `basic_end/`: 基础End节点
  - `end_with_json_schema/`: 带JSON Schema的End节点
  - `end_with_custom_output/`: 带自定义输出的End节点

- **note/**: Note节点相关测试
  - `basic_note/`: 基础Note节点
  - `note_with_metadata/`: 带元数据的Note节点

### 工具节点 (tool_nodes)

- **file_search/**: 文件搜索工具
  - `basic_search/`: 基础搜索
  - `search_with_filters/`: 带过滤器的搜索

- **guardrails/**: 护栏工具
  - `content_filtering/`: 内容过滤
  - `safety_checks/`: 安全检查

- **mcp/**: MCP工具
  - `basic_mcp/`: 基础MCP
  - `mcp_with_schema/`: 带Schema的MCP

### 逻辑节点 (logic_nodes)

- **if_else/**: 条件判断节点
  - `simple_condition/`: 简单条件
  - `complex_condition/`: 复杂条件

- **user_approval/**: 用户审批节点
  - `basic_approval/`: 基础审批
  - `approval_with_timeout/`: 带超时的审批

### 数据处理 (data_processing)

- **transform/**: 数据转换节点
  - `basic_transform/`: 基础转换
  - `transform_with_schema/`: 带Schema的转换

- **set_state/**: 状态设置节点
  - `simple_state/`: 简单状态
  - `complex_state/`: 复杂状态

### 工作流组合 (workflow_combinations)

- **simple_workflows/**: 简单工作流
  - `start_agent_end/`: Start-Agent-End
  - `start_note_end/`: Start-Note-End

- **tool_workflows/**: 工具工作流
  - `agent_file_search_end/`: Agent-文件搜索-End
  - `agent_guardrails_end/`: Agent-护栏-End

- **logic_workflows/**: 逻辑工作流
  - `agent_if_else_end/`: Agent-条件判断-End
  - `agent_approval_end/`: Agent-审批-End

- **complex_workflows/**: 复杂工作流
  - `agent_tools_logic_end/`: Agent-工具-逻辑-End
  - `full_featured_workflow/`: 全功能工作流

## 测试用例文件

每个测试用例目录包含：

- `input.json`: 工作流输入定义
- `expected_output.py`: 期望的Python代码输出

## 文件创建规则

**重要：创建任何测试用例时，只创建空白的输入输出文件，不填写内容！**

- 创建 `input.json` 和 `expected_output.py` 两个空白文件
- 让用户自己填写文件内容
- 这样可以确保用户完全控制测试用例的内容和结构
- 适用于所有目录下的测试用例：core_nodes、tool_nodes、logic_nodes、data_processing、workflow_combinations、templates 等

## 命名规范

- 目录名使用小写字母和下划线
- 测试用例名使用描述性的功能名称
- 组合测试用例使用节点类型连接（如：`agent_file_search_end`）

## 添加新测试用例

1. 在相应的节点类型目录下创建新的测试用例目录
2. 添加 `input.json` 和 `expected_output.py` 文件
3. 测试会自动发现并运行新的测试用例

## 迁移历史

- 从简单的数字编号（01-11）迁移到分类目录结构
- 支持递归查找测试用例
- 保持向后兼容性
