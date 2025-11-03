# Branch Indentation Management System

## Overview

This document describes the design and implementation of a unified indentation management system for branching nodes in the code generator.

## Branching Nodes

The following node types create branches in the generated Python code:

1. **If/Else Nodes** (`builtins.IfElse`)
   - Branches: `case-0`, `case-1`, ..., `else` (fallback)
   - Each branch can contain different code paths

2. **Guardrails Nodes** (`builtins.Guardrails`)
   - Branches: `on_pass` (success), implicit `else` (failure)
   - Moderation outcomes create conditional execution

3. **User Approval Nodes** (`builtins.BinaryApproval`)
   - Branches: `on_approve`, `on_reject`
   - Approval decisions determine execution path

## Indentation Level System

### Concept

Each branching node increases the indentation level for code within its branches:

```
Indentation Level 0 (Base):
  if condition:        # 2 spaces

Indentation Level 1 (Inside first branch):
      if condition:    # 4 spaces

Indentation Level 2 (Nested branch):
          code         # 6 spaces
```

### Calculation

```typescript
// indentLevel parameter represents nesting depth
// 0 = top-level (2 spaces)
// 1 = inside one branch (4 spaces)
// 2 = inside two branches (6 spaces)

const indent = '  '.repeat(indentLevel + 1)
```

## Current Implementation

### If/Else Node Generator

- **File**: `lib/generators/nodes/if-else-node.ts`
- **Status**: Supports `state.field` and `workflow.field` expression transformation
- **Indentation**: Currently hardcoded to level 0 for backward compatibility

```typescript
export function generateIfElseNodeCode(
  node: WorkflowNode,
  indentLevel: number = 0
): string {
  // Transform expressions
  const firstPredicate = firstCase.predicate?.expression
    .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
    .replace(/state\.(\w+)/g, 'state["$1"]')
    : 'True'

  // Generate with indentation
  let code = `
  if ${firstPredicate}:`
  // ...
}
```

### Expression Transformation

All branching node generators support:

- `workflow.fieldName` → `workflow["fieldName"]`
- `state.fieldName` → `state["fieldName"]`

This ensures dynamic variable references are properly escaped for Python.

## Future Improvements

### 1. Multi-Path Traversal (Priority: High)

**Challenge**: Current generator uses single-path traversal, but branches create multiple paths.

**Solution**: Implement a branch-aware traversal system:

```typescript
// Pseudocode for future implementation
function traverseBranch(
  startNode: WorkflowNode,
  branchPort: string, // e.g., 'case-0', 'on_pass', 'on_reject'
  indentLevel: number
): string {
  // Generate code for this branch
  let code = ''
  let currentNode = startNode

  while (currentNode) {
    code += generateNodeCode(currentNode, indentLevel)

    // Move to next node in this branch
    const edge = getOutgoingEdge(currentNode.id, branchPort)
    if (!edge) break

    currentNode = findNodeById(edge.target_node_id)
    // Update branchPort for next iteration (usually 'on_result')
  }

  return code
}
```

### 2. Nested Indentation for Multiple Branches

Once multi-path traversal is implemented, each branch path will automatically receive correct indentation:

```python
# Generated from workflow with nested If/Else
if state["branch1"]:
  if state["branch2"]:
    # indentLevel = 2
    agent_result = await Runner.run(agent, ...)
    return agent_result
  else:
    return workflow
else:
  return workflow
```

### 3. Guardrails and User Approval Integration

Similar multi-path handling for other branching nodes:

```python
# Guardrails node with pass/fail branches
guardrails_result = guardrails_runtime.run(...)

if guardrails_result["safe"]:
  # indentLevel = 1 (success branch)
  [subsequent code]
else:
  # indentLevel = 1 (failure branch)
  return error
```

## Architecture Changes Required

### Main Code Generator

1. **Add Branch Detection**:

```typescript
function isBranchingNode(nodeType: string): boolean {
  return [
    'builtins.IfElse',
    'builtins.Guardrails',
    'builtins.BinaryApproval',
  ].includes(nodeType)
}
```

2. **Track Indent Level**:

```typescript
let indentLevel = 0

// When entering a branch
if (isBranchingNode(nextNode.node_type)) {
  indentLevel++
  // Generate all branches with this indent level
}

// When exiting all branches
indentLevel--
```

3. **Multi-Branch Generation**:

```typescript
// For each branch of a branching node
for (const branch of getBranches(nextNode)) {
  const branchCode = traverseBranch(nextNode, branch.port, indentLevel)
  mainFunctionBody += branchCode
}
```

## Testing Strategy

### Phase 1: Current (Completed)

- ✅ Single If/Else node with state.field support
- ✅ Multiple independent If/Else nodes (different branches)
- ✅ All existing tests pass (53 tests)

### Phase 2: Planned

- [ ] Nested If/Else nodes (case-0 → case-0)
- [ ] If/Else followed by Agent in same branch
- [ ] Guardrails with nested If/Else
- [ ] User Approval with branching logic

### Phase 3: Integration

- [ ] Complex workflows with mixed branching types
- [ ] Performance optimization for large workflows
- [ ] Edge case handling (circular references, deep nesting)

## Code Examples

### Current Capability: Single If/Else

**Input**: Simple If/Else node with state variable

**Output**:

```python
if state["input_as_text"] == "":
  # branch content
else:
  # alternative content
```

### Future Capability: Nested Branches

**Input**: Start → If/Else → If/Else → Agent → End

**Output**:

```python
if condition1:
  if condition2:
    agent_result = await Runner.run(...)
    return agent_result
  else:
    return workflow
else:
  return workflow
```

## Performance Considerations

- **Single-Path Traversal**: O(n) where n = number of nodes
- **Multi-Path Traversal**: O(b^d) where b = branches per node, d = depth
- **Optimization**: Cache traversal results for multiple branches

## References

- [Agent Variable Naming](./AGENT_VARIABLE_NAMING.md)
- [Guardrails Node Implementation](./GUARDRAILS_NODE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
