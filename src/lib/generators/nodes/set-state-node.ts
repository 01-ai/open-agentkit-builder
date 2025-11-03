import { WorkflowNode } from '../../types/workflow'
import { convertCELToPython } from '../helpers'

export function generateSetStateNodeCode(node: WorkflowNode): string {
  const config = node.config || {}
  const assignments = config.assignments || []

  let code = ''

  for (const assignment of assignments) {
    const name = assignment.name
    const expr = assignment.expression?.expression || ''

    // Skip empty expressions
    if (!expr.trim()) {
      continue
    }

    // Convert CEL expression to Python
    const pythonExpr = convertCELToPython(expr)

    code += `
  state["${name}"] = ${pythonExpr}`
  }

  return code
}
