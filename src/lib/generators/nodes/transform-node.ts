import { WorkflowNode } from '../../types/workflow'
import { convertCELToPython } from '../helpers'

export function generateTransformNodeCode(node: WorkflowNode): string {
  const config = node.config || {}
  const expr = config.expr?.expression || '{}'

  // Convert CEL expression to Python
  let pythonExpr = convertCELToPython(expr)

  // Remove empty field names and their values (e.g., "": , "": )
  pythonExpr = pythonExpr.replace(/""\s*:\s*,?\s*/g, '')

  // Remove any remaining empty field patterns
  pythonExpr = pythonExpr.replace(/,\s*""\s*:\s*,?\s*/g, '')
  pythonExpr = pythonExpr.replace(/,\s*""\s*:\s*}/g, '}')

  // Clean up any trailing commas and spaces
  pythonExpr = pythonExpr.replace(/,(\s*[}\]])/g, '$1')

  // Remove all trailing whitespace characters
  pythonExpr = pythonExpr.replace(/\s+$/, '')

  // Final trim to ensure no leading/trailing whitespace
  pythonExpr = pythonExpr.trim()

  // Force remove any trailing spaces before closing brace
  pythonExpr = pythonExpr.replace(/\s+}$/g, '}')

  // Handle cases where we have empty field names like {"result":}
  pythonExpr = pythonExpr.replace(/{\s*"[^"]*":\s*}/g, '{}')

  // Handle empty or incomplete expressions
  if (
    pythonExpr === '{"result": }' ||
    pythonExpr === '{}' ||
    (pythonExpr.includes(': ,') && !pythonExpr.includes('workflow'))
  ) {
    pythonExpr = '{}'
  }

  // Format multi-line object if it has multiple properties
  if (
    pythonExpr.includes(',') &&
    pythonExpr.startsWith('{') &&
    pythonExpr.endsWith('}')
  ) {
    try {
      // Replace None with null for JSON parsing, then convert back
      const jsonStr = pythonExpr.replace(/None/g, 'null')
      const obj = JSON.parse(jsonStr)
      const keys = Object.keys(obj)
      if (keys.length > 1) {
        const formattedLines = keys
          .map((key) => {
            const value = obj[key]
            const valueStr = value === null ? 'None' : JSON.stringify(value)
            return `    "${key}": ${valueStr}`
          })
          .join(',\n')
        pythonExpr = `{\n${formattedLines}\n  }`
      }
    } catch (e) {
      // If JSON parsing fails, use original expression
    }
  }

  return `
  transform_result = ${pythonExpr}`
}
