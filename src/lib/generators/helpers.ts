import { WorkflowNode } from '../types/workflow'

// Simple CEL expression validator
export function isValidCELExpression(expression: string): boolean {
  // Basic validation - check for common invalid patterns
  if (!expression || expression.trim() === '') {
    return false
  }

  // Check for obviously invalid syntax patterns
  const invalidPatterns = [
    /invalid syntax/i,
    /syntax error/i,
    /undefined variable/i,
    /missing operand/i,
    /unexpected token/i,
  ]

  return !invalidPatterns.some((pattern) => pattern.test(expression))
}

// Generate Pydantic model from JSON schema
export function generatePydanticModel(schema: any): string {
  if (!schema || !schema.properties) {
    return ''
  }

  const properties = Object.entries(schema.properties)
    .map(([key, value]: [string, any]) => {
      const pythonType = value.type === 'string' ? 'str' : value.type
      return `  ${key}: ${pythonType}`
    })
    .join('\n')

  return `class WorkflowInput(BaseModel):
${properties}`
}

// Generate state dictionary from state variables
export function generateStateDict(stateVars: any[]): string {
  if (!stateVars || stateVars.length === 0) {
    return 'state = {\n\n  }'
  }

  const stateEntries = stateVars
    .map((stateVar) => {
      let defaultValue: string
      if (stateVar.default === undefined) defaultValue = 'None'
      else if (typeof stateVar.default === 'string')
        defaultValue = `"${stateVar.default}"`
      else if (Array.isArray(stateVar.default)) defaultValue = `[\n\n    ]`
      else defaultValue = String(stateVar.default)
      return `    "${stateVar.name}": ${defaultValue}`
    })
    .join(',\n')

  return `state = {
${stateEntries}
  }`
}

// Generate end result from schema
export function generateEndResultFromSchema(
  schema: any,
  indentLevel: number = 1
): string {
  if (!schema || !schema.properties) {
    return '{}'
  }

  const indent = '  '.repeat(indentLevel)
  const properties = Object.entries(schema.properties)
    .map(([key, value]: [string, any]) => {
      if (value.type === 'object') {
        const nestedObject = generateEndResultFromSchema(value, indentLevel + 1)
        return `${indent}"${key}": ${nestedObject}`
      } else if (value.type === 'array') {
        // Always generate empty array for now
        return `${indent}"${key}": [\n\n${indent}]`
      } else {
        return `${indent}"${key}": None`
      }
    })
    .join(',\n')

  return `{\n${properties}\n${'  '.repeat(indentLevel - 1)}}`
}

// Convert CEL expression to Python
export function convertCELToPython(expr: string): string {
  let pythonExpr = expr
    .replace(/workflow\.([a-zA-Z_][a-zA-Z0-9_]*)\s*/g, 'workflow["$1"]')
    .replace(/state\.([a-zA-Z_][a-zA-Z0-9_]*)\s*/g, 'state["$1"]')
    .replace(/undefined/g, 'None')
    .replace(/\+\s*/g, ' + ')
    .trim()

  // Clean up extra spaces around string concatenation
  pythonExpr = pythonExpr.replace(/\s*\+\s*/g, ' + ')

  return pythonExpr
}

// Check if workflow has specific node types
export function checkNodeTypes(nodes: WorkflowNode[]) {
  return {
    hasAgent: nodes.some((n) => n.node_type === 'builtins.Agent'),
    hasEndNode: nodes.some((n) => n.node_type === 'builtins.End'),
    hasFileSearch: nodes.some(
      (n) => n.node_type === 'builtins.tool.FileSearch'
    ),
    hasGuardrails: nodes.some((n) => n.node_type === 'builtins.Guardrails'),
    hasIfElse: nodes.some((n) => n.node_type === 'builtins.IfElse'),
    hasUserApproval: nodes.some(
      (n) => n.node_type === 'builtins.BinaryApproval'
    ),
    hasTransform: nodes.some((n) => n.node_type === 'builtins.Transform'),
    hasSetState: nodes.some((n) => n.node_type === 'builtins.SetState'),
  }
}
