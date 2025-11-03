import { WorkflowNode } from '../../types/workflow'
import { isValidCELExpression } from '../helpers'

export interface IfElseStructure {
  framework: string
  caseConditions: string[]
  indentLevel: number
}

/**
 * Generate If/Else node code with optional placeholder system
 * @param node - The If/Else node
 * @param useTemplate - If true, returns framework with placeholders for nested content
 *                     If false, returns simple if/elif/else structure (for non-nested workflows)
 */
export function generateIfElseNodeCode(
  node: WorkflowNode,
  useTemplate: boolean = false,
  indentLevel: number = 0
): string {
  const config = node.config || {}
  const cases = config.cases || []

  if (cases.length > 0) {
    // Validate all expressions first
    const invalidExpressions: string[] = []
    for (let i = 0; i < cases.length; i++) {
      const case_ = cases[i]
      const expression = case_.predicate?.expression

      if (expression !== undefined && !isValidCELExpression(expression)) {
        invalidExpressions.push(expression)
      }
    }

    if (invalidExpressions.length > 0) {
      const errorMessages = invalidExpressions.map(
        (expr) =>
          `Expecting: one of these possible Token sequences: 1. [OpenParenthesis] 2. [BooleanLiteral] 3. [Null] 4. [StringLiteral] 5. [Float] 6. [Integer] 7. [OpenBracket] 8. [OpenCurlyBracket] 9. [Identifier, OpenParenthesis] 10. [ObjectIdentifier, Dot] 11. [ObjectIdentifier, OpenBracket] 12. [ObjectIdentifier] but found: '${expr}'`
      )
      throw new Error(
        `Failed to parse expressions: ${errorMessages.join(', ')}`
      )
    }

    // Generate if statement for first case
    const firstCase = cases[0]
    const firstPredicate = firstCase.predicate?.expression
      ? firstCase.predicate.expression
          .trim()
          .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
          .replace(/state\.(\w+)/g, 'state["$1"]')
      : 'True'

    let code: string
    const baseIndent = '  '.repeat(indentLevel + 1)

    if (useTemplate) {
      // Template mode - use placeholders for content
      // Only add leading newline at top level (indentLevel 0)
      const leadingNewline = indentLevel === 0 ? '\n' : ''
      code = `${leadingNewline}${baseIndent}if ${firstPredicate}:\n${baseIndent}  {CONTENT_0}`

      // Generate elif statements for remaining cases
      for (let i = 1; i < cases.length; i++) {
        const case_ = cases[i]
        const predicate = case_.predicate?.expression
          ? case_.predicate.expression
              .trim()
              .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
              .replace(/state\.(\w+)/g, 'state["$1"]')
          : 'True'

        code += `\n${baseIndent}elif ${predicate}:\n${baseIndent}  {CONTENT_${i}}`
      }

      // Generate else statement
      code += `\n${baseIndent}else:\n${baseIndent}  {CONTENT_ELSE}`
    } else {
      // Direct mode - simple structure without content
      code = `
  if ${firstPredicate}:`

      // Generate elif statements for remaining cases
      for (let i = 1; i < cases.length; i++) {
        const case_ = cases[i]
        const predicate = case_.predicate?.expression
          ? case_.predicate.expression
              .trim()
              .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
              .replace(/state\.(\w+)/g, 'state["$1"]')
          : 'True'

        code += `

  elif ${predicate}:`
      }

      // Generate else statement
      code += `

  else:`
    }

    return code
  }

  return ''
}
