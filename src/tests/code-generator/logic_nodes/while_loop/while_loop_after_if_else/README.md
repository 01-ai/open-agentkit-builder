# While Loop After If/Else Test Case

## 目的

测试当 While 循环节点跟在 If/Else 节点之后时的代码生成和**缩进是否正确**。这个测试用于验证在不同分支和循环节点的组合下，缩进规则是否遵循正确的规则。

## 文件说明

- **input.json**: 包含 If/Else 节点后跟 While 循环节点的工作流配置
- **expected_output.py**: 预期生成的正确 Python 代码（重点验证缩进）

## 测试场景

本测试用于验证以下情况：

- If/Else 节点之后的 While 循环是否在正确的缩进级别
- While 循环条件是否正确转换
- 整体工作流的缩进是否一致

## 工作流结构

```
Start → If/Else → While Loop → End
```

## 待填写

1. 在 `input.json` 中填写工作流配置
   - Start 节点
   - If/Else 节点（包含分支）
   - While 循环节点（在 If/Else 之后）
   - End 节点

2. 在 `expected_output.py` 中填写预期生成的 Python 代码
   - 导入语句
   - 输入类定义
   - If/Else 代码块
   - While 循环代码块（验证缩进）
   - Return 语句
