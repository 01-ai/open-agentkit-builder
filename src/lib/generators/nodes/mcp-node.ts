import { WorkflowNode } from '../../types/workflow'

export function generateMcpNodeCode(
  node: WorkflowNode,
  mcpIndex: number = 0
): string {
  const config = node.config || {}
  const transportType = config.transportType || 'http'
  const url = config.url || ''
  const toolName = config.toolName || ''
  const parametersStr = config.parameters || '{}'

  // Parse parameters JSON
  let parameters = {}
  try {
    parameters = JSON.parse(parametersStr)
  } catch (e) {
    parameters = {}
  }

  // Generate variable names
  const varName = mcpIndex === 0 ? 'mcp_result' : `mcp_result${mcpIndex}`
  const clientVarName = mcpIndex === 0 ? 'mcp_client' : `mcp_client${mcpIndex}`
  const transportVarName =
    mcpIndex === 0 ? 'mcp_transport' : `mcp_transport${mcpIndex}`

  // Format parameters as Python dict
  const formattedParams = Object.entries(parameters)
    .map(([key, value]) => {
      const valueStr =
        typeof value === 'string' ? `"${value}"` : JSON.stringify(value)
      return `      "${key}": ${valueStr}`
    })
    .join(',\n')

  const parametersCode =
    formattedParams.length > 0 ? `{\n${formattedParams}\n    }` : '{}'

  // Generate authentication headers if needed
  let authHeaders = ''
  const authType = config.authType || 'none'
  const customHeaders: Record<string, string> = {}

  if (authType === 'api_key' && config.apiKey) {
    customHeaders['Authorization'] = `Api-Key ${config.apiKey}`
  } else if (authType === 'bearer' && config.bearerToken) {
    customHeaders['Authorization'] = `Bearer ${config.bearerToken}`
  } else if (authType === 'custom' && config.customHeaders) {
    try {
      const parsed = JSON.parse(config.customHeaders)
      Object.assign(customHeaders, parsed)
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Build headers dict
  const headersDict = Object.entries(customHeaders)
    .map(([key, value]) => `      "${key}": "${value}"`)
    .join(',\n')

  const headersCode = headersDict.length > 0 ? `{\n${headersDict}\n    }` : '{}'

  // Generate timeout value
  const timeout = config.timeout || 30

  if (transportType === 'http' || transportType === 'sse') {
    // HTTP/SSE transport
    return `
  # MCP Client initialization (HTTP/SSE)
  ${transportVarName} = SSEClientTransport(
    url="${url}",
    headers=${headersCode}
  )
  ${clientVarName} = Client(transport=${transportVarName})
  await ${clientVarName}.initialize()

  # Call MCP tool
  ${varName} = await ${clientVarName}.call_tool(
    name="${toolName}",
    arguments=${parametersCode}
  )

  # Close connection
  await ${clientVarName}.close()`
  } else {
    // Stdio transport (default)
    const serverUrl = config.serverUrl || ''
    return `
  # MCP Client initialization (Stdio)
  ${transportVarName} = StdioClientTransport(
    command="python",
    args=["${serverUrl}"]
  )
  ${clientVarName} = Client(transport=${transportVarName})
  await ${clientVarName}.initialize()

  # Call MCP tool
  ${varName} = await ${clientVarName}.call_tool(
    name="${toolName}",
    arguments=${parametersCode}
  )

  # Close connection
  await ${clientVarName}.close()`
  }
}
