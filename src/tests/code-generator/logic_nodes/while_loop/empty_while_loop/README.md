# Empty While Loop Test Case

## 目的

测试配置了空白 While 循环节点时的代码生成行为。当 While 循环节点没有正确配置条件或分支时，应该产生预期的错误或警告。

## 文件说明

- **input.json**: 包含空白 While 循环节点的工作流配置
- **expected_output.py**: 预期生成的 Python 代码（如果有错误则为 expected_error.txt）

## While 循环节点参数

While 循环节点 (`builtins.While`) 应该包含:

- `condition`: 循环条件表达式
- `loop_body`: 循环体内容
- 可选的退出条件或迭代限制

## 测试场景

本测试用于验证以下情况：

- While 循环条件为空时的行为
- While 循环体为空时的行为
- While 循环配置不完整时的代码生成

## 待填写

1. 在 `input.json` 中填写工作流配置
2. 在 `expected_output.py` 中填写预期的代码输出（或创建 `expected_error.txt` 如果应该报错）
