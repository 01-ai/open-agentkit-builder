# While Loop with Exit Condition Test Case

## 目的

测试配置了有效的 While 循环节点，并包含跳出条件（退出条件）时的代码生成行为。这是一个有效的用例，应该成功生成 Python 代码。

## 文件说明

- **input.json**: 包含有效 While 循环节点的工作流配置，包括循环条件和退出条件
- **expected_output.py**: 预期生成的正确 Python 代码

## While 循环节点参数

While 循环节点 (`builtins.While`) 应该包含:

- `condition`: 有效的循环条件表达式（CEL 格式）
- `body`: 循环体配置
- `max_iterations`: 最大迭代次数（防止无限循环）
- 可选的退出条件或停止条件

## 测试场景

本测试用于验证以下情况：

- While 循环条件为有效表达式时的代码生成
- 包含跳出条件的 While 循环处理
- 正确的循环体代码生成
- 循环变量初始化和更新

## 待填写

1. 在 `input.json` 中填写工作流配置
   - Start 节点
   - While 循环节点（有有效的条件表达式）
   - 可选的循环体节点
   - End 节点

2. 在 `expected_output.py` 中填写预期生成的 Python 代码
   - 导入语句
   - 输入类定义
   - While 循环代码
   - 正确的循环结构
