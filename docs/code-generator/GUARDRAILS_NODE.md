# Guardrails 节点技术文档

本文档详细说明了 Guardrails 节点的实现原理、配置选项、代码生成逻辑和测试用例。

## 概述

Guardrails 节点是一个内容安全工具，用于检测和过滤工作流中的不当内容。它基于 OpenAI 的 Moderation API 和 Guardrails 框架，提供多种内容安全检查功能。

## 节点类型

- **节点类型**: `builtins.Guardrails`
- **分类**: 工具节点 (Tool Node)
- **主要功能**: 内容安全检查、PII 检测、越狱检测、内容审核

## 配置结构

### 基本配置

```json
{
  "id": "node_id",
  "label": "Guardrails",
  "node_type": "builtins.Guardrails",
  "config": {
    "continue_on_error": false,
    "expr": {
      "expression": "workflow.input_as_text",
      "format": "cel"
    },
    "guardrails": []
  }
}
```

### 配置参数

#### 1. `continue_on_error` (boolean)

- **默认值**: `false`
- **功能**: 控制当 Guardrails 检查失败时是否继续执行工作流
- **行为**:
  - `true`: 捕获异常，返回错误信息，继续执行
  - `false`: 抛出异常，停止工作流执行

#### 2. `expr` (object)

- **功能**: 定义要检查的输入表达式
- **属性**:
  - `expression` (string): CEL 表达式，指定要检查的内容
  - `format` (string): 表达式格式，通常为 "cel"

**支持的表达式类型**:

- `workflow.input_as_text` - 工作流输入文本
- `state.variable_name` - 状态变量
- `workflow.field_name` - 工作流字段

#### 3. `guardrails` (array)

- **功能**: 定义要执行的安全检查规则
- **类型**: 数组，包含多个 Guardrail 配置对象

## Guardrail 类型

### 1. Moderation (内容审核)

检测有害或不当内容。

```json
{
  "type": "moderation",
  "config": {
    "categories": [
      "sexual/minors",
      "hate/threatening",
      "harassment/threatening",
      "self-harm/instructions",
      "violence/graphic",
      "illicit/violent"
    ]
  }
}
```

**配置参数**:

- `categories` (array): 要检查的内容类别列表

### 2. PII (个人身份信息检测)

检测和过滤个人身份信息。

```json
{
  "type": "pii",
  "config": {
    "block": true,
    "entities": ["PERSON", "EMAIL", "PHONE_NUMBER", "CREDIT_CARD", "SSN"]
  }
}
```

**配置参数**:

- `block` (boolean): 是否阻止包含 PII 的内容
- `entities` (array): 要检测的 PII 实体类型

### 3. Jailbreak (越狱检测)

检测试图绕过 AI 安全限制的提示。

```json
{
  "type": "jailbreak",
  "config": {
    "model": "gpt-4o-mini",
    "confidence_threshold": 0.7
  }
}
```

**配置参数**:

- `model` (string): 用于检测的模型，默认为 "gpt-4o-mini"
- `confidence_threshold` (number): 置信度阈值，默认为 0.7

## 代码生成

### 变量命名规则

Guardrails 节点的变量命名基于节点的 `label` 属性：

#### 默认 Label "Guardrails"

- 配置变量: `guardrails_config`
- 输入变量: `guardrails_inputtext`
- 结果变量: `guardrails_result`
- 输出变量: `guardrails_output`

#### 自定义 Label

- 配置变量: `{label}_config` (如 `newname_config`)
- 其他变量保持 `guardrails_` 前缀

### 生成的代码结构

#### 1. 导入和初始化

```python
from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
```

#### 2. 配置定义

```python
# Guardrails definitions
{configVarName} = {
  "guardrails": [
    # Guardrail 配置对象
  ]
}
```

#### 3. 工具函数

```python
def guardrails_has_tripwire(results):
    return any(getattr(r, "tripwire_triggered", False) is True for r in (results or []))

def get_guardrail_checked_text(results, fallback_text):
    for r in (results or []):
        info = getattr(r, "info", None) or {}
        if isinstance(info, dict) and ("checked_text" in info):
            return info.get("checked_text") or fallback_text
    return fallback_text

def build_guardrail_fail_output(results):
    failures = []
    for r in (results or []):
        if getattr(r, "tripwire_triggered", False):
            info = getattr(r, "info", None) or {}
            failure = {
                "guardrail_name": info.get("guardrail_name"),
            }
            for key in ("flagged", "confidence", "threshold", "hallucination_type", "hallucinated_statements", "verified_statements"):
                if key in (info or {}):
                    failure[key] = info.get(key)
            failures.append(failure)
    return {"failed": len(failures) > 0, "failures": failures}
```

#### 4. 主执行逻辑

**无错误处理模式** (`continue_on_error: false`):

```python
guardrails_inputtext = {expression}
guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", instantiate_guardrails(load_config_bundle({configVarName})), suppress_tripwire=True)
guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
if guardrails_hastripwire:
    return guardrails_output
else:
    return guardrails_output
```

**错误处理模式** (`continue_on_error: true`):

```python
try:
    guardrails_inputtext = {expression}
    guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", instantiate_guardrails(load_config_bundle({configVarName})), suppress_tripwire=True)
    guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
    guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
    guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
    if guardrails_hastripwire:
        return guardrails_output
    else:
        return guardrails_output
except Exception as guardrails_error:
    guardrails_errorresult = {
        "message": getattr(guardrails_error, "message", "Unknown error"),
    }
```

## 表达式处理

### 支持的表达式格式

1. **工作流变量**: `workflow.field_name` → `workflow["field_name"]`
2. **状态变量**: `state.variable_name` → `state["variable_name"]`

### 表达式转换逻辑

```typescript
let expr = config.expr?.expression || 'workflow["input_as_text"]'

// Convert workflow.field to workflow["field"]
if (expr.includes('workflow.')) {
  expr = expr.replace(/workflow\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'workflow["$1"]')
}

// Convert state.field to state["field"]
if (expr.includes('state.')) {
  expr = expr.replace(/state\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'state["$1"]')
}
```

## 测试用例

### 测试覆盖范围

1. **default_guardrails** - 默认配置
2. **guardrails_continue_on_error** - 错误处理模式
3. **guardrails_moderation** - 内容审核
4. **guardrails_pii** - PII 检测
5. **guardrails_jailbreak** - 越狱检测
6. **guardrails_jailbreak_continue_on_error** - 越狱检测 + 错误处理
7. **guardrails_moderation_jailbreak_continue_on_error** - 组合配置
8. **guardrails_with_name_and_input** - 自定义名称和输入

### 测试用例结构

每个测试用例包含：

- `input.json` - 工作流配置
- `expected_output.py` - 期望的 Python 代码输出
- `image.png` - 节点配置截图（可选）

## 实现细节

### 核心文件

- **代码生成器**: `lib/generators/nodes/guardrails-node.ts`
- **主逻辑**: `lib/code-generator.ts` (Guardrails 配置生成)
- **测试用例**: `tests/code-generator/tool_nodes/guardrails/`

### 关键函数

1. **`generateGuardrailsNodeCode`**: 生成 Guardrails 节点代码
2. **配置生成逻辑**: 在 `lib/code-generator.ts` 中生成 Guardrails 配置
3. **变量名生成**: 基于节点 label 动态生成变量名

### 依赖库

- **OpenAI**: `AsyncOpenAI` 客户端
- **Guardrails**: `guardrails.runtime` 运行时
- **Pydantic**: 数据验证和序列化

## 使用示例

### 基本使用

```json
{
  "node_type": "builtins.Guardrails",
  "label": "Content Filter",
  "config": {
    "continue_on_error": false,
    "expr": {
      "expression": "workflow.input_as_text",
      "format": "cel"
    },
    "guardrails": [
      {
        "type": "moderation",
        "config": {
          "categories": ["hate/threatening", "violence/graphic"]
        }
      }
    ]
  }
}
```

### 高级配置

```json
{
  "node_type": "builtins.Guardrails",
  "label": "Advanced Security",
  "config": {
    "continue_on_error": true,
    "expr": {
      "expression": "state.user_input",
      "format": "cel"
    },
    "guardrails": [
      {
        "type": "moderation",
        "config": {
          "categories": ["sexual/minors", "hate/threatening"]
        }
      },
      {
        "type": "pii",
        "config": {
          "block": true,
          "entities": ["PERSON", "EMAIL", "PHONE_NUMBER"]
        }
      },
      {
        "type": "jailbreak",
        "config": {
          "model": "gpt-4o-mini",
          "confidence_threshold": 0.8
        }
      }
    ]
  }
}
```

## 错误处理

### 异常类型

1. **Guardrails 检查失败**: 返回失败信息和详细信息
2. **表达式错误**: 抛出表达式解析异常
3. **配置错误**: 抛出配置验证异常

### 错误输出格式

```python
{
  "failed": true,
  "failures": [
    {
      "guardrail_name": "Moderation",
      "flagged": true,
      "confidence": 0.95,
      "threshold": 0.7
    }
  ]
}
```

## 最佳实践

1. **合理设置 `continue_on_error`**: 根据业务需求决定是否继续执行
2. **选择合适的检查类型**: 根据内容类型选择相应的 Guardrail
3. **调整置信度阈值**: 根据误报率调整检测敏感度
4. **组合使用多种检查**: 结合多种 Guardrail 类型提供全面保护
5. **监控和日志**: 记录 Guardrails 检查结果用于分析和优化

## 性能考虑

1. **异步执行**: 使用 `await` 避免阻塞工作流
2. **缓存配置**: Guardrails 配置在生成时缓存，避免重复解析
3. **错误处理**: 合理的错误处理避免不必要的重试
4. **资源管理**: 正确管理 OpenAI 客户端连接

## 扩展性

Guardrails 节点设计支持：

- 添加新的 Guardrail 类型
- 自定义检查逻辑
- 集成第三方安全服务
- 动态配置更新

---

**注意**: 本文档会随 Guardrails 节点功能更新而持续维护
