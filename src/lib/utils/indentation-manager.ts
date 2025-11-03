/**
 * Indentation Manager for Code Generation
 *
 * This module provides a centralized way to handle indentation in code generation,
 * separating the concerns of template generation and content indentation.
 */

export interface IndentationContext {
  baseIndent: number
  relativeIndent: number
  totalIndent: number
}

export class IndentationManager {
  private static readonly INDENT_UNIT = 2 // 2 spaces per indent level

  /**
   * Calculate indentation context for a given nesting level
   */
  static getContext(
    indentLevel: number,
    relativeLevel: number = 0
  ): IndentationContext {
    const baseIndent = indentLevel * this.INDENT_UNIT
    const relativeIndent = relativeLevel * this.INDENT_UNIT
    const totalIndent = baseIndent + relativeIndent

    return {
      baseIndent,
      relativeIndent,
      totalIndent,
    }
  }

  /**
   * Apply indentation to code content
   * @param content - The code content to indent
   * @param indentLevel - The base indentation level
   * @param relativeIndent - Additional relative indentation (default: 0)
   * @param options - Additional options
   */
  static apply(
    content: string,
    indentLevel: number,
    relativeIndent: number = 0,
    options: {
      skipFirstLine?: boolean
      preserveEmptyLines?: boolean
    } = {}
  ): string {
    const { skipFirstLine = false, preserveEmptyLines = true } = options
    const context = this.getContext(indentLevel, relativeIndent)

    if (!content.trim()) {
      return content
    }

    // Remove leading newline if present
    let cleanContent = content
    if (cleanContent.startsWith('\n')) {
      cleanContent = cleanContent.substring(1)
    }

    const lines = cleanContent.split('\n')
    const indentString = ' '.repeat(context.totalIndent)

    const indentedLines = lines.map((line, index) => {
      // Skip first line if requested
      if (skipFirstLine && index === 0) {
        return line
      }

      // Preserve empty lines
      if (preserveEmptyLines && !line.trim()) {
        return line
      }

      // Apply indentation
      return line ? `${indentString}${line}` : line
    })

    return indentedLines.join('\n')
  }

  /**
   * Remove base indentation from content (for placeholder replacement)
   * @param content - The content to adjust
   * @param baseIndentLevel - The base indentation level to remove
   */
  static removeBaseIndent(content: string, baseIndentLevel: number): string {
    if (!content.trim()) {
      return content
    }

    const baseIndentString = ' '.repeat(baseIndentLevel * this.INDENT_UNIT)
    const lines = content.split('\n')

    const adjustedLines = lines.map((line) => {
      if (line.startsWith(baseIndentString)) {
        return line.substring(baseIndentString.length)
      }
      return line
    })

    return adjustedLines.join('\n')
  }

  /**
   * Generate a template with placeholders (no indentation)
   * @param template - The template string
   * @param indentLevel - The indentation level for the template
   */
  static generateTemplate(template: string, indentLevel: number): string {
    return this.apply(template, indentLevel, 0, { skipFirstLine: false })
  }

  /**
   * Replace placeholders with properly indented content
   * @param template - The template with placeholders
   * @param placeholders - Map of placeholder names to content
   * @param indentLevel - The base indentation level
   */
  static replacePlaceholders(
    template: string,
    placeholders: Record<string, string>,
    indentLevel: number
  ): string {
    let result = template

    for (const [placeholder, content] of Object.entries(placeholders)) {
      if (content.trim()) {
        // Apply proper indentation to content
        const indentedContent = this.apply(content, indentLevel, 0)
        result = result.replace(
          new RegExp(`\\{${placeholder}\\}`, 'g'),
          indentedContent
        )
      } else {
        // Remove placeholder if no content
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), '')
      }
    }

    return result
  }

  /**
   * Create a relative indentation context for nested content
   * @param parentIndentLevel - The parent's indentation level
   * @param childRelativeLevel - The child's relative level (default: 1)
   */
  static createNestedContext(
    parentIndentLevel: number,
    childRelativeLevel: number = 1
  ): IndentationContext {
    return this.getContext(parentIndentLevel, childRelativeLevel)
  }
}
