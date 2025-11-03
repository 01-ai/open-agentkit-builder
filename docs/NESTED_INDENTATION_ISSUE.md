# Nested Indentation Issue

## Current Status
- **Tests Passing**: 53/55 (96.4%)
- **Tests Failing**: 
  1. `multiple_if_else` - 4-level nested If/Else indentation issue
  2. `multiple_user_approval` - 5-level nested User Approval indentation issue

## Problem Analysis

### Expected Output
```python
  if state["string_var_name"]:           # 2 spaces
    if state["string_var_name"]:         # 4 spaces (2 + 2)
      if state["string_var_name"]:       # 6 spaces (2 + 2 + 2)
        agent_result_temp = await Runner.run(...)
```

### Actual Output
```python
  if state["string_var_name"]:           # 2 spaces ✓
      if state["string_var_name"]:       # 8 spaces ✗ (should be 4)
          if state["string_var_name"]:   # 12 spaces ✗ (should be 6)
```

## Root Cause

The issue is in the placeholder replacement logic in `lib/code-generator.ts`:

1. `generateIfElseNodeCode` generates code with correct `baseIndent`:
   - Level 0: `baseIndent = '  '.repeat(1) = '  '` (2 spaces) ✓
   - Level 1: `baseIndent = '  '.repeat(2) = '    '` (4 spaces) ✓
   - Level 2: `baseIndent = '  '.repeat(3) = '      '` (6 spaces) ✓

2. The template includes placeholders with `baseIndent`:
   ```typescript
   code = `${baseIndent}if ${predicate}:\n${baseIndent}  {CONTENT_0}`
   ```

3. When replacing `{CONTENT_0}` with nested If/Else code:
   - Placeholder has `baseIndent` (e.g., 4 spaces for level 1)
   - `branchCode` also has `baseIndent` (e.g., 4 spaces for level 1)
   - Result: 8 spaces (duplication!)

## Solution Approaches Tried

### Approach 1: Remove extra 2 spaces from placeholder
- Changed `${baseIndent}  {CONTENT_0}` to `${baseIndent}{CONTENT_0}`
- Result: Still fails because `branchCode` has its own `baseIndent`

### Approach 2: Adjust `branchCode` indentation during replacement
- Remove `branchCode`'s `baseIndent` before replacement
- Problem: Also affects Agent code indentation

### Approach 3: Change `baseIndent` calculation
- Changed `'  '.repeat(indentLevel + 1)` to `'  '.repeat(indentLevel)`
- Result: Breaks other If/Else tests

## Recommended Solution

**Option A: Redesign the indentation architecture**
- Separate concerns: template generation vs. content indentation
- Use relative indentation instead of absolute indentation
- Implement a proper indentation manager

**Option B: Fix placeholder replacement logic**
- Detect node type (If/Else vs. Agent) before adjusting indentation
- Apply different indentation rules for different node types
- Add proper indentation context tracking

## Next Steps

1. Choose between Option A (architectural redesign) or Option B (targeted fix)
2. Implement the chosen solution
3. Verify all 55 tests pass
4. Document the final solution

## Related Files

- `lib/code-generator.ts` - Main code generator with placeholder replacement logic
- `lib/generators/nodes/if-else-node.ts` - If/Else node code generation
- `lib/generators/nodes/binary-approval-node.ts` - User Approval node code generation
- `tests/code-generator/logic_nodes/if_else/multiple_if_else/` - Test case
- `tests/code-generator/logic_nodes/user_approval/multiple_user_approval/` - Test case

