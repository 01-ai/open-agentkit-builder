import { WorkflowNode } from '../types/workflow'

export function generateAgentCode(node: WorkflowNode): {
  agentCode: string
  schemaModels: string[]
} {
  const config = node.config || {}
  const messages = config.messages || []
  const tools = config.tools || []
  const model = config.model || 'gpt-4o'
  const temperature = config.temperature || 0.7
  const maxTokens = config.max_tokens || 1000
  const summary = config.summary || ''

  // Generate schema models for tools
  const schemaModels: string[] = []
  let toolsCode = ''

  if (tools.length > 0) {
    toolsCode = `
  tools=[`

    for (const tool of tools) {
      if (tool.type === 'function') {
        const functionName = tool.function?.name || 'unknown_function'
        const description = tool.function?.description || ''
        const parameters = tool.function?.parameters || {}

        // Generate Pydantic model for function parameters
        if (parameters.properties) {
          const className = `${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Parameters`
          const properties = Object.entries(parameters.properties)
            .map(([key, value]: [string, any]) => {
              const pythonType = value.type === 'string' ? 'str' : value.type
              return `  ${key}: ${pythonType}`
            })
            .join('\n')

          schemaModels.push(`class ${className}(BaseModel):
${properties}`)

          toolsCode += `
    Tool(
      name="${functionName}",
      description="${description}",
      parameters=${className},
      function=${functionName}
    ),`
        }
      }
    }

    toolsCode += `
  ]`
  }

  // Generate messages
  const messagesCode = messages
    .map((msg: any) => {
      if (msg.type === 'system') {
        return `    Message(role="system", content="${msg.text || ''}")`
      } else if (msg.type === 'user') {
        return `    Message(role="user", content="${msg.text || ''}")`
      }
      return ''
    })
    .filter(Boolean)
    .join(',\n')

  // Generate agent code
  const agentCode = `agent = Agent(
  name="${node.label || 'Agent'}",
  model=ModelSettings(
    model="${model}",
    temperature=${temperature},
    max_tokens=${maxTokens}${summary ? `,\n    reasoning=ModelSettings.Reasoning(summary="${summary}")` : ''}
  ),
  instructions=[
${messagesCode}
  ]${toolsCode}
)`

  return {
    agentCode,
    schemaModels,
  }
}
