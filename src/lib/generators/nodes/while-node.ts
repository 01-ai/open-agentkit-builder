import { WorkflowNode } from '../../types/workflow'

export function generateWhileLoopNodeCode(
  node: WorkflowNode,
  indentLevel: number = 0,
  bodyContent: string = ''
): string {
  const config = node.config || {}
  const condition = config.condition?.expression || ''

  // Convert expressions for Python compatibility
  const pythonCondition = condition
    .trim()
    .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
    .replace(/state\.(\w+)/g, 'state["$1"]')

  const indent = '  '.repeat(indentLevel + 1)

  // Generate while loop with condition
  let code = `\n${indent}while ${pythonCondition}:`

  if (bodyContent) {
    // Add body content with proper indentation
    code += bodyContent
  }

  return code
}
