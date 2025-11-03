# Code Generator Documentation

## Table of Contents

### 🎯 Quick Start

- **[Branch Node Indentation Rules](./BRANCH_NODE_INDENTATION_RULES.md)** - Complete indentation rules summary for If/Else, Guardrails, and User Approval nodes (START HERE)
- **[Branch Node Comparison](./BRANCH_NODE_COMPARISON.md)** - Visual comparison with code examples showing indentation patterns for all three node types

### 📚 Detailed Documentation

1. **[Branch Indentation Design Summary](./BRANCH_INDENTATION_DESIGN.md)** - Complete analysis and design of the branch indentation system
2. **[Branch Indentation Management](./BRANCH_INDENTATION.md)** - Detailed indentation system architecture and design
3. **[Agent Variable Naming Rules](./AGENT_VARIABLE_NAMING.md)** - How Agent nodes are named when multiple instances exist
4. **[Guardrails Node Implementation](./GUARDRAILS_NODE.md)** - Guardrails node configuration and code generation details
5. **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Overview of the entire implementation

---

## 🔀 Branch Node Types

### If/Else Node (`builtins.IfElse`)
- ✅ Full nesting support
- ✅ Template-based indentation system
- ✅ Linear indentation growth (+1 per level)
- 📍 Docs: [Rules](./BRANCH_NODE_INDENTATION_RULES.md#1️⃣-if-else-节点), [Comparison](./BRANCH_NODE_COMPARISON.md#1️⃣-if-else-节点)

### Guardrails Node (`builtins.Guardrails`)
- ❌ No nesting support
- ✅ Fixed top-level execution
- ✅ Independent from other branches
- 📍 Docs: [Detailed Info](./GUARDRAILS_NODE.md), [Comparison](./BRANCH_NODE_COMPARISON.md#2️⃣-guardrails-节点)

### User Approval Node (`builtins.BinaryApproval`)
- ✅ Chain-based support (multiple approval nodes)
- ✅ Automatic indentation cascade (+2 per node)
- ✅ Recursive traversal
- 📍 Docs: [Rules](./BRANCH_NODE_INDENTATION_RULES.md#3️⃣-user-approval-节点), [Comparison](./BRANCH_NODE_COMPARISON.md#3️⃣-user-approval-节点)

---

## 📐 Indentation Rules Summary

| Node Type | Nesting | Increment | Formula |
|-----------|---------|-----------|---------|
| **If/Else** | ✅ Full | +1 per level | `indentLevel + 1` |
| **User Approval** | ✅ Chain | +2 per node | `1 + (nodeIndex * 2)` |
| **Guardrails** | ❌ None | Fixed 0 | Always top-level |

### Indentation Unit
- **Base unit**: 2 spaces
- **Per level**: `'  '.repeat(indentLevel + 1)`

---

## 🧪 Test Coverage

- ✅ **57/57 tests passing** (100%)
- ✅ Single and nested If/Else nodes
- ✅ Chain of User Approval nodes
- ✅ Multiple Guardrails configurations
- ✅ Expression transformation (workflow.field → workflow["field"])
- ✅ MCP node HTTP/SSE transport

### Test Locations
```
tests/code-generator/
├── logic_nodes/
│   ├── if_else/          # If/Else tests
│   ├── user_approval/    # User Approval tests
│   └── mcp/              # MCP node tests
├── tool_nodes/
│   └── guardrails/       # Guardrails tests
└── core_nodes/
    └── agent/            # Agent tests
```

---

## 🚀 Implementation Status

### ✅ Completed Features

- If/Else nested branching with dynamic indentation
- User Approval chain detection and recursive processing
- Guardrails configuration and execution
- Expression transformation for state/workflow variables
- MCP node HTTP/SSE support with authentication
- Comprehensive test suite with 57 test cases

### 📋 Supported Workflow Patterns

1. Single If/Else node
2. Nested If/Else nodes (unlimited depth)
3. Chain of User Approval nodes
4. Independent Guardrails nodes
5. Mixed patterns (top-level branches)

### ⏳ Future Enhancements

1. If/Else with branching User Approval inside
2. Multi-level cross-node nesting
3. Branch convergence and rejoin patterns
4. Loop node support (While, For Each)

---

## 💡 Key Concepts

### Template System
- If/Else uses `{CONTENT_0}`, `{CONTENT_ELSE}`, etc. placeholders
- Placeholders are replaced with actual branch code during traversal
- Enables proper indentation calculation before code generation

### Recursive Traversal
- Each branch is traversed recursively
- `indentLevel` is incremented for nested contexts
- Base case: reach End node or leaf node

### Chain Detection
- User Approval nodes detect if they're part of a chain
- Chain: multiple BinaryApproval nodes connected via `on_approve` port
- Chain processing uses recursive function with (+2) indentation increment

---

## 📖 Reading Guide

### For Understanding Overall Architecture
1. Start with [BRANCH_NODE_COMPARISON.md](./BRANCH_NODE_COMPARISON.md) for visual examples
2. Read [BRANCH_NODE_INDENTATION_RULES.md](./BRANCH_NODE_INDENTATION_RULES.md) for detailed rules
3. Reference [BRANCH_INDENTATION_DESIGN.md](./BRANCH_INDENTATION_DESIGN.md) for design decisions

### For Specific Node Implementation
- **If/Else**: See [BRANCH_NODE_INDENTATION_RULES.md](./BRANCH_NODE_INDENTATION_RULES.md#1️⃣-if-else-节点)
- **Guardrails**: See [GUARDRAILS_NODE.md](./GUARDRAILS_NODE.md)
- **User Approval**: See [BRANCH_NODE_INDENTATION_RULES.md](./BRANCH_NODE_INDENTATION_RULES.md#3️⃣-user-approval-节点)

### For Code References
- Code locations provided in each documentation file
- Cross-references between files for related concepts

---

## 🔗 Quick Links

- **Main Code**: `lib/code-generator.ts`
- **Node Generators**: `lib/generators/nodes/`
- **Tests**: `tests/code-generator/`
- **Type Definitions**: `types/workflow.ts`

---

**Last Updated**: 2025-10 | Status: ✅ Complete | Tests: 57/57 ✓
