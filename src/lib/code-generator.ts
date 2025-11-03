// Import types and helpers
import {
  generateEndResultFromSchema,
  generatePydanticModel,
  generateStateDict,
} from './generators/helpers'
import { generateBinaryApprovalNodeCode } from './generators/nodes/binary-approval-node'
import { generateFileSearchNodeCode } from './generators/nodes/file-search-node'
import { generateGuardrailsNodeCode } from './generators/nodes/guardrails-node'
import { generateIfElseNodeCode } from './generators/nodes/if-else-node'
import { generateMcpNodeCode } from './generators/nodes/mcp-node'
import { generateSetStateNodeCode } from './generators/nodes/set-state-node'
import { generateTransformNodeCode } from './generators/nodes/transform-node'
import { generateWhileLoopNodeCode } from './generators/nodes/while-node'
import { Edge, Workflow, WorkflowNode } from './types/workflow'

// --- Helper Functions ---

const mapJsonTypeToPython = (jsonType: string): string => {
  const typeMapping: { [key: string]: string } = {
    string: 'str',
    number: 'float',
    boolean: 'bool',
    array: 'list',
    object: 'dict',
  }
  return typeMapping[jsonType] || 'Any'
}

const generatePydanticModelFromSchema = (
  schema: any,
  className: string = 'AgentSchema'
): { models: string[]; mainModel: string } => {
  if (!schema || schema.type !== 'object') return { models: [], mainModel: '' }

  const models: string[] = []
  const properties: string[] = []

  const processProperty = (
    key: string,
    value: any,
    parentName: string = className
  ): string => {
    if (!value || typeof value !== 'object') {
      return `  ${key}: Any`
    }
    if (value.type === 'object') {
      const nestedClassName = `${parentName}__${key.charAt(0).toUpperCase() + key.slice(1)}`
      const nestedResult = generatePydanticModelFromSchema(
        value,
        nestedClassName
      )
      models.push(...nestedResult.models)
      models.push(nestedResult.mainModel)
      return `  ${key}: ${nestedClassName}`
    } else if (value.type === 'array') {
      if (value.items && value.items.type === 'object') {
        // Handle array of objects - create nested class
        const itemClassName = `${parentName}__${key.charAt(0).toUpperCase() + key.slice(1)}Item`
        const itemResult = generatePydanticModelFromSchema(
          value.items,
          itemClassName
        )
        models.push(...itemResult.models)
        models.push(itemResult.mainModel)
        return `  ${key}: list[${itemClassName}]`
      } else {
        const itemType = value.items?.type === 'string' ? 'str' : 'Any'
        return `  ${key}: list[${itemType}]`
      }
    } else {
      return `  ${key}: ${mapJsonTypeToPython(value.type)}`
    }
  }

  Object.entries(schema.properties || {}).forEach(
    ([key, value]: [string, any]) => {
      properties.push(processProperty(key, value))
    }
  )

  const mainModel = `class ${className}(BaseModel):\n${properties.join('\n')}`

  return { models, mainModel }
}

const generateToolDefinition = (tool: any): string => {
  const { name, parameters } = tool
  if (!parameters || !parameters.properties) {
    return `@function_tool\ndef ${name}():\n  pass`
  }

  const paramList = Object.entries(parameters.properties)
    .map(
      ([key, value]: [string, any]) =>
        `${key}: ${mapJsonTypeToPython(value.type)}`
    )
    .join(', ')

  return `@function_tool\ndef ${name}(${paramList}):\n  pass`
}

// Generate meaningful agent variable name
function generateAgentVarName(
  label: string,
  index: number,
  totalAgentCount: number = 1,
  allAgentLabels: string[] = []
): string {
  // Convert label to snake_case
  const snakeCase = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  // Rule 1: Default label "Agent" generates agent[x]
  // First one uses "agent", others use agent1, agent3, etc., skipping numbers used by custom labels
  if (snakeCase === 'agent') {
    // Count how many "Agent" labels appear before this one
    let defaultLabelCount = 0
    for (let i = 0; i < index; i++) {
      if (allAgentLabels[i].toLowerCase() === 'agent') {
        defaultLabelCount++
      }
    }

    if (defaultLabelCount === 0) {
      return 'agent'
    }

    // Find the next available number, skipping those used by custom labels
    let candidateNumber = defaultLabelCount
    const customAgentNames = allAgentLabels
      .map((l, i) => {
        if (l.toLowerCase() !== 'agent') {
          const snakeCase = l
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
          return snakeCase
        }
        return null
      })
      .filter((n) => n !== null)

    while (customAgentNames.includes(`agent${candidateNumber}`)) {
      candidateNumber++
    }

    return `agent${candidateNumber}`
  }

  // Rule 2: Custom label like "Agent2" generates agent2
  return snakeCase || `agent_${index + 1}`
}

// Generate meaningful schema name
function generateSchemaName(label: string, index: number): string {
  // Convert label to PascalCase
  const pascalCase = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  return pascalCase + 'Schema' || `AgentSchema_${index + 1}`
}

const generateAgentCode = (
  agentNode: WorkflowNode,
  agentIndex: number = 0,
  totalAgentCount: number = 1,
  allAgentLabels: string[] = []
): { agentCode: string; schemaModels: string[]; agentVarName: string } => {
  const model = agentNode.config?.model?.expression?.replace(/"/g, '') || ''
  const instructions =
    agentNode.config?.instructions?.expression?.replace(/"/g, '') || ''
  const effort = agentNode.config?.reasoning?.effort || 'low'
  const summary = agentNode.config?.reasoning?.summary
  const parallelToolCalls = agentNode.config?.parallel_tool_calls || false
  const tools = agentNode.config?.tools || []
  const textFormat = agentNode.config?.text?.format

  // Generate meaningful variable name based on agent label
  const agentVarName = generateAgentVarName(
    agentNode.label,
    agentIndex,
    totalAgentCount,
    allAgentLabels
  )

  let toolDefinitions = ''
  let toolReferences = ''
  let parallelToolCallsLine = ''
  let outputTypeLine = ''
  let schemaModels: string[] = []

  if (tools.length > 0) {
    // Separate web_search tools from function tools
    const functionTools = tools.filter((tool: any) => tool.type === 'function')
    const webSearchTools = tools.filter(
      (tool: any) => tool.type === 'web_search'
    )

    // Generate tool definitions for function tools only
    if (functionTools.length > 0) {
      toolDefinitions =
        '# Tool definitions\n' +
        functionTools.map(generateToolDefinition).join('\n\n') +
        '\n\n'
    }

    // Generate tool references
    const toolRefs = []
    if (functionTools.length > 0) {
      toolRefs.push(...functionTools.map((tool: any) => tool.name))
    }
    if (webSearchTools.length > 0) {
      // For web_search tools, we need to find the corresponding WebSearchTool variable
      // We'll use a simple approach: web_search_preview, web_search_preview1, etc.
      webSearchTools.forEach((tool: any, toolIndex: number) => {
        const varName =
          toolIndex === 0
            ? 'web_search_preview'
            : `web_search_preview${toolIndex + 1}`
        toolRefs.push(varName)
      })
    }

    if (toolRefs.length > 0) {
      toolReferences = `,\n  tools=[\n    ${toolRefs.join(',\n    ')}\n  ]`
    }
    parallelToolCallsLine = `\n    parallel_tool_calls=${parallelToolCalls ? 'True' : 'False'},`
  }

  // Handle JSON schema output format
  if (textFormat?.type === 'json_schema' && textFormat.schema) {
    const schemaName = generateSchemaName(agentNode.label, agentIndex)
    const schemaResult = generatePydanticModelFromSchema(
      textFormat.schema,
      schemaName
    )
    schemaModels = schemaResult.models
    schemaModels.push(schemaResult.mainModel)
    outputTypeLine = `,\n  output_type=${schemaName}`
  }

  const summaryLine = summary ? `,\n      summary="${summary}"` : ''

  // Format instructions for multi-line strings if needed
  // Use triple quotes if string contains literal \n in JSON
  const hasLiteralNewlines = instructions.includes('\\n')

  const formattedInstructions = hasLiteralNewlines
    ? `"""${instructions.replace(/\\n/g, '\n')}"""`
    : `"${instructions}"`

  const agentCode = `${toolDefinitions}${agentVarName} = Agent(
  name="${agentNode.label}",
  instructions=${formattedInstructions},
  model="${model}"${toolReferences}${outputTypeLine},
  model_settings=ModelSettings(${parallelToolCallsLine}
    store=True,
    reasoning=Reasoning(
      effort="${effort}"${summaryLine}
    )
  )
)
`

  return { agentCode, schemaModels, agentVarName }
}

const collectApprovalChainWithAgents = (
  startApprovalNode: WorkflowNode,
  edges: Edge[],
  nodes: WorkflowNode[]
): {
  approvals: WorkflowNode[]
  agents: WorkflowNode[]
  hasIfElse: boolean
} => {
  const approvals: WorkflowNode[] = [startApprovalNode]
  const agents: WorkflowNode[] = []
  let hasIfElse = false
  let currentNode: WorkflowNode | undefined = startApprovalNode

  while (currentNode && currentNode.node_type === 'builtins.BinaryApproval') {
    const approveEdge = edges.find(
      (e) =>
        e.source_node_id === currentNode!.id &&
        e.source_port_id === 'on_approve'
    )

    if (!approveEdge) break

    const nextNode = nodes.find((n) => n.id === approveEdge.target_node_id)
    if (!nextNode) break

    if (nextNode.node_type === 'builtins.Agent') {
      agents.push(nextNode)

      // Look for node after agent
      const agentEdge = edges.find((e) => e.source_node_id === nextNode.id)
      if (!agentEdge) break

      const nodeAfterAgent = nodes.find(
        (n) => n.id === agentEdge.target_node_id
      )
      if (!nodeAfterAgent) break

      if (nodeAfterAgent.node_type === 'builtins.BinaryApproval') {
        approvals.push(nodeAfterAgent)
        currentNode = nodeAfterAgent
      } else if (nodeAfterAgent.node_type === 'builtins.IfElse') {
        // Mark that we have an If/Else after the agent
        hasIfElse = true
        break
      } else {
        break
      }
    } else {
      break
    }
  }

  return { approvals, agents, hasIfElse }
}

// Helper function to generate If/Else content nested within approval branches
const generateNestedIfElseContent = (
  ifElseNode: WorkflowNode,
  sourceAgentResultVar: string,
  caseIndex: number,
  indentLevel: number,
  edges: Edge[],
  nodes: WorkflowNode[]
): string => {
  const config = ifElseNode.config || {}
  const cases = config.cases || []
  let code = ''

  if (caseIndex >= cases.length) return code

  const case_ = cases[caseIndex]
  const predicate = case_.predicate?.expression
    ? case_.predicate.expression
        .trim()
        .replace(
          /input\.output_text/g,
          `${sourceAgentResultVar}["output_text"]`
        )
        .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
        .replace(/state\.(\w+)/g, 'state["$1"]')
    : 'True'

  const indent = '  '.repeat(indentLevel)
  const nestedIndent = '  '.repeat(indentLevel + 1)

  if (caseIndex === 0) {
    code += `
${indent}if ${predicate}:`
  } else {
    code += `
${indent}elif ${predicate}:`
  }

  // Find what's in this case
  const caseEdge = edges.find(
    (e) =>
      e.source_node_id === ifElseNode.id &&
      e.source_port_id === case_.output_port_id
  )

  if (caseEdge) {
    const caseNode = nodes.find((n) => n.id === caseEdge.target_node_id)
    if (caseNode && caseNode.node_type === 'builtins.Agent') {
      // Generate Agent code within the case
      const allAgents = nodes.filter((n) => n.node_type === 'builtins.Agent')
      const agentIndex = allAgents.findIndex((n) => n.id === caseNode.id)
      const agentVar = agentIndex === 0 ? 'agent' : `agent${agentIndex}`
      const tempVar = `agent_result_temp${agentIndex === 0 ? '' : agentIndex}`
      const resultVar = `agent_result${agentIndex === 0 ? '' : agentIndex}`

      const agentMessages = caseNode.config?.messages || []
      const hasMessages = agentMessages.length > 0
      let inputContent = ''
      if (hasMessages) {
        inputContent = `
${nestedIndent}    *conversation_history,
${nestedIndent}    {
${nestedIndent}      "role": "user",
${nestedIndent}      "content": [
${nestedIndent}        {
${nestedIndent}          "type": "input_text",
${nestedIndent}          "text": "User Instruction"
${nestedIndent}        }
${nestedIndent}      ]
${nestedIndent}    }`
      } else {
        inputContent = `
${nestedIndent}    *conversation_history`
      }

      code += `
${nestedIndent}${tempVar} = await Runner.run(
${nestedIndent}  ${agentVar},
${nestedIndent}  input=[${inputContent}
${nestedIndent}  ]
${nestedIndent})

${nestedIndent}conversation_history.extend([item.to_input_item() for item in ${tempVar}.new_items])

${nestedIndent}${resultVar} = {
${nestedIndent}  "output_text": ${tempVar}.final_output_as(str)
${nestedIndent}}`

      // Check what's after this agent
      const agentEdge = edges.find((e) => e.source_node_id === caseNode.id)
      if (agentEdge) {
        const nodeAfterAgent = nodes.find(
          (n) => n.id === agentEdge.target_node_id
        )
        if (
          nodeAfterAgent &&
          nodeAfterAgent.node_type === 'builtins.Guardrails'
        ) {
          // Generate Guardrails code
          const rawLabel =
            nodeAfterAgent.label
              ?.toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '_')
              .replace(/^_|_$/g, '') || 'guardrails'

          let guardrailsVarName: string
          if (rawLabel === 'guardrails') {
            let defaultLabelCount = 0
            const guardrailsNodes = nodes.filter(
              (n) => n.node_type === 'builtins.Guardrails'
            )
            for (let i = 0; i < guardrailsNodes.length; i++) {
              const nodeRawLabel =
                guardrailsNodes[i]?.label
                  ?.toLowerCase()
                  .replace(/[^a-z0-9\s]/g, '')
                  .replace(/\s+/g, '_')
                  .replace(/^_|_$/g, '') || 'guardrails'
              if (
                nodeRawLabel === 'guardrails' &&
                guardrailsNodes[i].id === nodeAfterAgent.id
              ) {
                break
              }
              if (nodeRawLabel === 'guardrails') {
                defaultLabelCount++
              }
            }
            guardrailsVarName =
              defaultLabelCount === 0
                ? 'guardrails_config'
                : `guardrails_config${defaultLabelCount}`
          } else {
            guardrailsVarName = `${rawLabel}_config`
          }

          let guardrailsCode = generateGuardrailsNodeCode(
            nodeAfterAgent,
            guardrailsVarName,
            0,
            undefined
          )

          // Replace input.output_text with the agent result from the case
          guardrailsCode = guardrailsCode.replace(
            /input\.output_text/g,
            `${resultVar}["output_text"]`
          )

          // Adjust indentation of guardrails code to match case indentation
          const guardrailsLines = guardrailsCode.split('\n')
          const adjustedGuardrailsCode = guardrailsLines
            .map((line) => {
              if (line.trim() === '') return ''
              // Each line generated by generateGuardrailsNodeCode has 2-space base indentation
              // We need to replace it with nestedIndent
              return nestedIndent + line.replace(/^ {2}/, '')
            })
            .join('\n')

          code += adjustedGuardrailsCode
        }
      }
    }
  } else {
    // No content in this case
    code += `
${nestedIndent}pass`
  }

  // Generate remaining cases
  for (let i = caseIndex + 1; i < cases.length; i++) {
    code += generateNestedIfElseContent(
      ifElseNode,
      sourceAgentResultVar,
      i,
      indentLevel,
      edges,
      nodes
    )
  }

  // Generate else (fallback)
  if (caseIndex === cases.length - 1) {
    code += `
${indent}else:`
  }

  return code
}

// Helper function to collect all agents recursively, including those in If/Else branches
const collectAllAgentsRecursively = (
  startNode: WorkflowNode | undefined,
  edges: Edge[],
  nodes: WorkflowNode[],
  visited: Set<string> = new Set()
): WorkflowNode[] => {
  const agents: WorkflowNode[] = []
  const queue: WorkflowNode[] = []

  if (startNode) {
    queue.push(startNode)
  }

  while (queue.length > 0) {
    const currentNode = queue.shift()!

    if (visited.has(currentNode.id)) continue
    visited.add(currentNode.id)

    if (currentNode.node_type === 'builtins.Agent') {
      agents.push(currentNode)
    }

    // Find all outgoing edges
    const outgoingEdges = edges.filter(
      (e) => e.source_node_id === currentNode.id
    )

    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n) => n.id === edge.target_node_id)
      if (nextNode && !visited.has(nextNode.id)) {
        if (nextNode.node_type === 'builtins.IfElse') {
          // Recursively search within If/Else branches
          const caseEdges = edges.filter(
            (e) =>
              e.source_node_id === nextNode.id &&
              (e.source_port_id!.startsWith('case-') ||
                e.source_port_id === 'fallback')
          )
          for (const caseEdge of caseEdges) {
            const caseNode = nodes.find((n) => n.id === caseEdge.target_node_id)
            if (caseNode) {
              const branchAgents = collectAllAgentsRecursively(
                caseNode,
                edges,
                nodes,
                visited
              )
              agents.push(...branchAgents)
            }
          }
        } else if (
          nextNode.node_type !== 'builtins.End' &&
          nextNode.node_type !== 'builtins.Guardrails'
        ) {
          // Continue traversal for other node types (including Agent)
          queue.push(nextNode)
        }
      }
    }
  }

  return agents
}

// --- Main Generator ---

const generateWhileBodyCode = (
  bodyConfig: any,
  indentLevel: number = 0,
  allAgentsForNaming: WorkflowNode[] = []
): string => {
  if (!bodyConfig || !bodyConfig.nodes || bodyConfig.nodes.length === 0) {
    return ''
  }

  let bodyCode = ''
  const bodyNodes = bodyConfig.nodes as WorkflowNode[]
  const bodyEdges = bodyConfig.edges || []
  const bodyStartId = bodyConfig.start_node_id

  // Find the start node in body
  let currentNode = bodyNodes.find((n) => n.id === bodyStartId)
  if (!currentNode) return ''

  // Traverse and generate code for body nodes
  const visited = new Set<string>()
  const indent = '  '.repeat(indentLevel + 2)
  let agentResultTempCount = 0 // Track agent_result_temp appearances

  while (currentNode && !visited.has(currentNode.id)) {
    visited.add(currentNode.id)

    if (currentNode.node_type === 'builtins.Agent') {
      const agentIndex = allAgentsForNaming.findIndex(
        (a) => a.id === currentNode!.id
      )
      const agentLabels = allAgentsForNaming.map((a) => a.label)
      const agentVarName = generateAgentVarName(
        currentNode.label,
        agentIndex,
        allAgentsForNaming.length,
        agentLabels
      )

      const isDefaultLabel = currentNode.label.toLowerCase() === 'agent'
      const resultVarPrefix = isDefaultLabel
        ? 'agent_result'
        : `${agentVarName}_result`
      let defaultLabelCount = 0
      if (isDefaultLabel && agentIndex >= 0) {
        for (let i = 0; i < agentIndex; i++) {
          if (allAgentsForNaming[i].label.toLowerCase() === 'agent') {
            defaultLabelCount++
          }
        }
      }
      const resultVarSuffix =
        isDefaultLabel && defaultLabelCount > 0 ? String(defaultLabelCount) : ''

      // Use agent_result_temp with count suffix, not based on agent variable name
      const agentResultTempSuffix =
        agentResultTempCount > 0 ? String(agentResultTempCount) : ''

      bodyCode += `
${indent}agent_result_temp${agentResultTempSuffix} = await Runner.run(
${indent}  ${agentVarName},
${indent}  input=[
${indent}    *conversation_history
${indent}  ]
${indent})

${indent}conversation_history.extend([item.to_input_item() for item in agent_result_temp${agentResultTempSuffix}.new_items])

${indent}${resultVarPrefix}${resultVarSuffix} = {
${indent}  "output_text": agent_result_temp${agentResultTempSuffix}.final_output_as(str)
${indent}}`

      agentResultTempCount++
    } else if (currentNode.node_type === 'builtins.IfElse') {
      const config = currentNode.config || {}
      const cases = config.cases || []

      for (let caseIdx = 0; caseIdx < cases.length; caseIdx++) {
        const caseConfig = cases[caseIdx]
        const predicate = caseConfig.predicate?.expression || 'True'

        const pythonPredicate = predicate
          .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
          .replace(/state\.(\w+)/g, 'state["$1"]')
          .trim()

        bodyCode += `
${indent}${caseIdx === 0 ? 'if' : 'elif'} ${pythonPredicate}:`

        const caseEdge = bodyEdges.find(
          (e: Edge) =>
            e.source_node_id === currentNode!.id &&
            e.source_port_id === `case-${caseIdx}`
        )

        if (caseEdge) {
          const caseNode = bodyNodes.find(
            (n) => n.id === caseEdge.target_node_id
          )
          if (caseNode?.node_type === 'builtins.Agent') {
            const agentIndex = allAgentsForNaming.findIndex(
              (a) => a.id === caseNode.id
            )
            const agentLabels = allAgentsForNaming.map((a) => a.label)
            const agentVarName = generateAgentVarName(
              caseNode.label,
              agentIndex,
              allAgentsForNaming.length,
              agentLabels
            )

            const isDefaultLabel = caseNode.label.toLowerCase() === 'agent'
            const resultVarPrefix = isDefaultLabel
              ? 'agent_result'
              : `${agentVarName}_result`
            let defaultLabelCount = 0
            if (isDefaultLabel && agentIndex >= 0) {
              for (let i = 0; i < agentIndex; i++) {
                if (allAgentsForNaming[i].label.toLowerCase() === 'agent') {
                  defaultLabelCount++
                }
              }
            }
            const resultVarSuffix =
              isDefaultLabel && defaultLabelCount > 0
                ? String(defaultLabelCount)
                : ''

            // Use agent_result_temp with count suffix
            const agentResultTempSuffix =
              agentResultTempCount > 0 ? String(agentResultTempCount) : ''

            bodyCode += `
${indent}  agent_result_temp${agentResultTempSuffix} = await Runner.run(
${indent}    ${agentVarName},
${indent}    input=[
${indent}      *conversation_history
${indent}    ]
${indent}  )

${indent}  conversation_history.extend([item.to_input_item() for item in agent_result_temp${agentResultTempSuffix}.new_items])

${indent}  ${resultVarPrefix}${resultVarSuffix} = {
${indent}    "output_text": agent_result_temp${agentResultTempSuffix}.final_output_as(str)
${indent}  }`

            agentResultTempCount++
          }
        } else {
          bodyCode += `
${indent}  pass`
        }
      }

      bodyCode += `
${indent}else:`
    } else if (currentNode.node_type === 'builtins.Guardrails') {
      // Handle Guardrails node in While body
      // generateGuardrailsNodeCode generates code with 2-space base indentation
      // We need to adjust it to match While body indentation (4 spaces)
      const guardrailsCode = generateGuardrailsNodeCode(
        currentNode,
        'guardrails_config',
        0,
        'agent_result'
      )

      // Remove the base 2-space indentation and add our While body indentation
      const lines = guardrailsCode.split('\n')
      const adjustedCode = lines
        .map((line) => {
          if (!line) return ''
          // Remove the first 2 spaces that generateGuardrailsNodeCode added
          const trimmedLine = line.startsWith('  ') ? line.substring(2) : line
          return indent + trimmedLine
        })
        .join('\n')

      bodyCode += adjustedCode
    } else if (currentNode.node_type === 'builtins.While') {
      // Handle nested While loop
      const nestedCondition = currentNode.config?.condition?.expression || ''
      const pythonNestedCondition = nestedCondition
        .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
        .replace(/state\.(\w+)/g, 'state["$1"]')
        .trim()

      bodyCode += `
${indent}while ${pythonNestedCondition}:`

      // Generate nested while body
      const nestedBodyCode = generateWhileBodyCode(
        currentNode.config?.body,
        indentLevel + 1,
        allAgentsForNaming
      )
      if (nestedBodyCode) {
        bodyCode += nestedBodyCode
      }
    }

    const nextEdge = bodyEdges.find(
      (e: Edge) =>
        e.source_node_id === currentNode!.id &&
        !e.source_port_id?.startsWith('case-') &&
        e.source_port_id !== 'fallback'
    )
    if (!nextEdge) break

    currentNode = bodyNodes.find((n) => n.id === nextEdge.target_node_id)
  }

  return bodyCode
}

export const generatePythonSDK = (
  workflowJson: string
): { code: string; error: string } => {
  try {
    const workflow: Workflow = JSON.parse(workflowJson)
    const {
      nodes,
      edges,
      start_node_id,
      state_vars,
      input_variable_json_schema,
    } = workflow

    const pydanticModel = generatePydanticModel(input_variable_json_schema)
    const stateDict = generateStateDict(state_vars)

    let topLevelCode = ''
    let mainFunctionBody = ''
    let hasAgent = false
    const allSchemaModels: string[] = []
    let hasEndNode = false
    let isIfElseWorkflow = false
    let agentIndex = 0
    let fileSearchIndex = 0
    const webSearchTools: any[] = []
    let guardrailsIndex = 0
    let mcpIndex = 0

    // Check if there's an End node
    hasEndNode = nodes.some((n) => n.node_type === 'builtins.End')

    // Check if there's a FileSearch node
    const hasFileSearch = nodes.some(
      (n) => n.node_type === 'builtins.tool.FileSearch'
    ) // Define whileNodes early for later use
    const whileNodes = nodes.filter((n) => n.node_type === 'builtins.While')

    // Check if there's a Guardrails node
    const hasGuardrails =
      nodes.some((n) => n.node_type === 'builtins.Guardrails') ||
      whileNodes.some((w) =>
        w.config?.body?.nodes?.some(
          (n: WorkflowNode) => n.node_type === 'builtins.Guardrails'
        )
      )

    // Check if there's an Agent node
    hasAgent = nodes.some((n) => n.node_type === 'builtins.Agent')

    // Helper: Recursively collect all nodes from While loop bodies that need declaration
    const collectNodesFromWhileBodies = (
      nodeList: WorkflowNode[]
    ): WorkflowNode[] => {
      let collectedNodes: WorkflowNode[] = []
      for (const node of nodeList) {
        if (node.node_type === 'builtins.While' && node.config?.body?.nodes) {
          const bodyNodes = node.config.body.nodes as WorkflowNode[]
          // Collect only Agent nodes from While body that need declaration
          collectedNodes.push(
            ...bodyNodes.filter((n) => n.node_type === 'builtins.Agent')
          )
          // Recursively collect from nested While loops
          collectedNodes.push(...collectNodesFromWhileBodies(bodyNodes))
        }
      }
      return collectedNodes
    }

    const whileBodyNodes = collectNodesFromWhileBodies(nodes)
    if (whileBodyNodes.some((n) => n.node_type === 'builtins.Agent')) {
      hasAgent = true
    }

    // Combine all Agent nodes (main + While bodies) for later declaration
    const allNodesForDeclaration = [
      ...nodes.filter((n) => n.node_type === 'builtins.Agent'),
      ...whileBodyNodes,
    ] // Check if there are Guardrails at the top level (not in While body)
    const hasTopLevelGuardrails = nodes.some(
      (n) => n.node_type === 'builtins.Guardrails'
    )

    // Check if there's a BinaryApproval node
    const hasUserApproval = nodes.some(
      (n) => n.node_type === 'builtins.BinaryApproval'
    ) // Validate While loop nodes for empty conditions
    for (const whileNode of whileNodes) {
      // Only validate if the While node is reachable from the Start node
      // For disconnected nodes (no edges), skip validation
      if (edges.length === 0) {
        continue
      }

      // Check if this While node is reachable from Start
      const isReachable = edges.some(
        (edge) =>
          edge.target_node_id === whileNode.id ||
          edges.some(
            (e) =>
              e.source_node_id === edge.target_node_id &&
              e.target_node_id === whileNode.id
          )
      )

      if (isReachable) {
        const condition = whileNode.config?.condition?.expression || ''
        if (!condition || condition.trim() === '') {
          throw new Error(
            `Failed to parse expression : Expecting: one of these possible Token sequences: 1. [OpenParenthesis] 2. [BooleanLiteral] 3. [Null] 4. [StringLiteral] 5. [Float] 6. [Integer] 7. [OpenBracket] 8. [OpenCurlyBracket] 9. [Identifier, OpenParenthesis] 10. [ObjectIdentifier, Dot] 11. [ObjectIdentifier, OpenBracket] 12. [ObjectIdentifier] but found: ''`
          )
        }
      }
    }

    // Check if there's an MCP node
    const hasMcp = nodes.some((n) => n.node_type === 'builtins.MCP')

    // Check for web_search tools in Agent nodes
    nodes.forEach((node) => {
      if (node.node_type === 'builtins.Agent' && node.config?.tools) {
        node.config.tools.forEach((tool: any) => {
          if (tool.type === 'web_search') {
            webSearchTools.push(tool)
          }
        })
      }
    })

    // Find the start node
    let currentNode = nodes.find((n) => n.id === start_node_id)
    if (!currentNode) return { code: '', error: 'Start node not found' }

    // Check if this is an If/Else workflow (If/Else directly after Start)
    const startEdge = edges.find((e) => e.source_node_id === currentNode!.id)
    if (startEdge) {
      const nextAfterStart = nodes.find(
        (n) => n.id === startEdge.target_node_id
      )
      if (nextAfterStart?.node_type === 'builtins.IfElse') {
        isIfElseWorkflow = true
      }
    }

    // When there are no edges (disconnected workflow), pre-generate all definitions
    if (edges.length === 0) {
      // Generate all Agent definitions
      if (hasAgent) {
        const agentNodes = nodes.filter((n) => n.node_type === 'builtins.Agent')
        const allAgentLabels = agentNodes.map((n) => n.label)

        agentNodes.forEach((agentNode, index) => {
          const agentResult = generateAgentCode(
            agentNode,
            index,
            agentNodes.length,
            allAgentLabels
          )
          topLevelCode += agentResult.agentCode + '\n'
          allSchemaModels.push(...agentResult.schemaModels)
        })
      }

      // Generate all BinaryApproval definitions
      if (hasUserApproval) {
        const userApprovalNodes = nodes.filter(
          (n) => n.node_type === 'builtins.BinaryApproval'
        )

        userApprovalNodes.forEach((_, index) => {
          const approvalVarName =
            index === 0 ? 'approval_request' : `approval_request${index}`
          topLevelCode += `
def ${approvalVarName}(message: str):
  # TODO: Implement
  return True
`
        })
      }
    }

    // Generate initial part of the main function
    // For If/Else workflows:
    // - If there are state_vars, always add state initialization
    // - Otherwise, skip state initialization
    if (isIfElseWorkflow && !hasAgent) {
      // Check if there are state variables
      if (state_vars && state_vars.length > 0) {
        // If there are state vars, add state initialization
        mainFunctionBody += `\n  ${stateDict}
  workflow = workflow_input.model_dump()
  conversation_history: list[TResponseInputItem] = [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": workflow["input_as_text"]
        }
      ]
    }
  ]`
      } else {
        // No state vars, just add workflow and conversation_history
        mainFunctionBody += `
  workflow = workflow_input.model_dump()
  conversation_history: list[TResponseInputItem] = [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": workflow["input_as_text"]
        }
      ]
    }
  ]`
      }
    } else {
      mainFunctionBody += `
  ${stateDict}
  workflow = workflow_input.model_dump()
  conversation_history: list[TResponseInputItem] = [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": workflow["input_as_text"]
        }
      ]
    }
  ]`
    }

    // Helper function to traverse If/Else branches with template replacement
    const traverseIfElseBranch = (
      currentNodeId: string,
      branchPort: string,
      indentLevel: number
    ): string => {
      let code = ''
      let visitedNodeIds = new Set<string>()
      let nodeId: string | undefined = currentNodeId
      let nextPort = branchPort
      let agentCountInBranch = 0

      // Helper function to get output port for a node type
      const getOutputPort = (nodeType: string): string => {
        if (
          nodeType === 'builtins.tool.FileSearch' ||
          nodeType === 'builtins.Transform' ||
          nodeType === 'builtins.SetState' ||
          nodeType === 'builtins.Guardrails'
        ) {
          return 'out'
        }
        return 'on_result'
      }

      // Count total agents already processed globally to determine local agent index
      const totalAgentsProcessed =
        nodes.filter((n) => n.node_type === 'builtins.Agent').length -
        nodes.filter((n, idx) => {
          if (n.node_type !== 'builtins.Agent') return true
          return idx >= nodes.findIndex((nd) => nd.id === currentNodeId)
        }).length +
        agentIndex

      while (nodeId && !visitedNodeIds.has(nodeId)) {
        visitedNodeIds.add(nodeId)
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) break

        const indent = '  '.repeat(indentLevel + 1)

        if (node.node_type === 'builtins.IfElse') {
          // Use the template-based structure for proper nesting in If/Else workflows
          let ifElseCode = generateIfElseNodeCode(node, true, indentLevel)

          // Check if this If/Else directly follows an Agent by checking if previous code contains agent_result
          // Replace input.output_text with the most recent agent_result variable
          if (code.includes('agent_result')) {
            // Extract the last agent_result variable name used
            const agentResultMatch = code.match(/agent_result(\d*)(?:\s|=)/)
            const agentResultVar = agentResultMatch
              ? `agent_result${agentResultMatch[1] || ''}`
              : 'agent_result'
            ifElseCode = ifElseCode.replace(
              /input\.output_text/g,
              `${agentResultVar}["output_text"]`
            )
          }

          // generateIfElseNodeCode now handles indentation internally, so no extra application needed
          code += ifElseCode

          // Function to clean up remaining placeholders
          const cleanupPlaceholders = (content: string): string => {
            // Remove {CONTENT_X} placeholders but preserve structure
            content = content.replace(/\{CONTENT_\d+\}/g, '')
            content = content.replace(/\{CONTENT_ELSE\}/g, '')
            // Clean up lines that now only have whitespace after placeholder removal
            // This handles cases where "  {CONTENT_X}" becomes "  " and needs to be blank line
            content = content.replace(/\n\s+\n/g, '\n\n')
            return content
          }

          // Calculate the indentation for the placeholder line
          const placeholderIndent = '  '.repeat(indentLevel + 2)

          // Handle the case-0 (true branch) - this should go into the first if block
          const caseEdge = edges.find(
            (e) => e.source_node_id === nodeId && e.source_port_id === 'case-0'
          )
          if (caseEdge) {
            let branchCode = traverseIfElseBranch(
              caseEdge.target_node_id,
              'on_result',
              indentLevel + 1
            )
            if (branchCode.trim()) {
              // Remove leading newline from branchCode to avoid extra blank lines
              branchCode = branchCode.replace(/^\n/, '')
              // Replace the first content placeholder with the branch code
              // Use dynamic placeholder indentation based on indentLevel
              code = code.replace(`${placeholderIndent}{CONTENT_0}`, branchCode)
            } else {
              // No content for case-0, just remove the placeholder
              code = code.replace(`${placeholderIndent}{CONTENT_0}`, '')
            }
          } else {
            // No edge for case-0, just remove the placeholder
            code = code.replace(`${placeholderIndent}{CONTENT_0}`, '')
          }

          // Handle the fallback (else branch)
          const elseEdge = edges.find(
            (e) =>
              e.source_node_id === nodeId && e.source_port_id === 'fallback'
          )
          if (elseEdge) {
            let elseBranchCode = traverseIfElseBranch(
              elseEdge.target_node_id,
              'on_result',
              indentLevel + 1
            )
            if (elseBranchCode.trim()) {
              // Remove leading newline from elseBranchCode to avoid extra blank lines
              elseBranchCode = elseBranchCode.replace(/^\n/, '')
              // Replace the else content placeholder
              // Use dynamic placeholder indentation based on indentLevel
              code = code.replace(
                `${placeholderIndent}{CONTENT_ELSE}`,
                elseBranchCode
              )
            } else {
              // No content for else, just add return workflow
              code = code.replace(
                `${placeholderIndent}{CONTENT_ELSE}`,
                `${placeholderIndent}return workflow`
              )
            }
          } else {
            // No else edge, just remove the placeholder line entirely
            code = code.replace(`\n${placeholderIndent}{CONTENT_ELSE}`, '')
          }

          // Clean up any remaining placeholders
          code = cleanupPlaceholders(code)

          break
        } else if (node.node_type === 'builtins.Agent') {
          hasAgent = true

          // Calculate global agent index among all Agent nodes
          const allAgentNodes = nodes.filter(
            (n) => n.node_type === 'builtins.Agent'
          )
          const currentAgentIndexGlobal = allAgentNodes.findIndex(
            (n) => n.id === node.id
          )

          const agentVarName =
            node.label === 'Agent'
              ? currentAgentIndexGlobal === 0
                ? 'agent'
                : `agent${currentAgentIndexGlobal}`
              : node.label.replace(/\s+/g, '_').toLowerCase()

          // Generate result variable names with suffix based on global agent index
          const resultVarSuffix =
            currentAgentIndexGlobal === 0 ? '' : `${currentAgentIndexGlobal}`
          const agentTempVar = `agent_result_temp${resultVarSuffix}`
          const agentResultVar = `agent_result${resultVarSuffix}`

          const agentExecutionCode = `${indent}${agentTempVar} = await Runner.run(
${indent}  ${agentVarName},
${indent}  input=[
${indent}    *conversation_history
${indent}  ]
${indent})

${indent}conversation_history.extend([item.to_input_item() for item in ${agentTempVar}.new_items])

${indent}${agentResultVar} = {
${indent}  "output_text": ${agentTempVar}.final_output_as(str)
${indent}}`

          code += '\n' + agentExecutionCode
          agentCountInBranch++

          // Check if there's a next node after this Agent
          const nextAgentEdge = edges.find(
            (e) =>
              e.source_node_id === nodeId && e.source_port_id === 'on_result'
          )

          if (!nextAgentEdge) {
            // No next node, add return statement and break
            code += `\n${indent}return ${agentResultVar}`
            break
          }

          const nextAgentNode = nodes.find(
            (n) => n.id === nextAgentEdge.target_node_id
          )
          if (nextAgentNode?.node_type === 'builtins.IfElse') {
            // Next node is If/Else - add newline and continue to process it
            code += '\n'
            nodeId = nextAgentEdge.target_node_id
            nextPort = 'on_result'
            continue
          } else {
            // Next node is something else (or End) - add return and break
            code += `\n${indent}return ${agentResultVar}`
            break
          }
        } else if (node.node_type === 'builtins.Transform') {
          const transformCode = generateTransformNodeCode(node)
          // generateTransformNodeCode returns code with leading newline and 2-space indent
          // We need to adjust it to use the correct indentation for the branch
          const transformLines = transformCode.split('\n')
          const adjustedTransformCode = transformLines
            .map((line) => {
              if (!line) return ''
              // Replace the 2-space indent with the correct branch indent
              return line.replace(/^  /, indent)
            })
            .join('\n')
          code += adjustedTransformCode
          const nextTransformEdge = edges.find(
            (e) => e.source_node_id === nodeId && e.source_port_id === 'out'
          )
          if (nextTransformEdge) {
            const nextNode = nodes.find(
              (n) => n.id === nextTransformEdge.target_node_id
            )
            if (nextNode?.node_type === 'builtins.End') {
              // End node after Transform - return transform_result and break
              code += `\n${indent}return transform_result`
              break
            }
            nodeId = nextTransformEdge.target_node_id
            nextPort = 'on_result'
            continue
          } else {
            // No next node after Transform, return transform_result
            code += `\n${indent}return transform_result`
            break
          }
        } else if (node.node_type === 'builtins.SetState') {
          const setStateCode = generateSetStateNodeCode(node)
          // generateSetStateNodeCode returns code with leading newline and 2-space indent
          // We need to adjust it to use the correct indentation for the branch
          const setStateLines = setStateCode.split('\n')
          const adjustedSetStateCode = setStateLines
            .map((line) => {
              if (!line) return ''
              // Replace the 2-space indent with the correct branch indent
              return line.replace(/^  /, indent)
            })
            .join('\n')
          code += adjustedSetStateCode
          const nextSetStateEdge = edges.find(
            (e) => e.source_node_id === nodeId && e.source_port_id === 'out'
          )
          if (nextSetStateEdge) {
            const nextNode = nodes.find(
              (n) => n.id === nextSetStateEdge.target_node_id
            )
            if (nextNode?.node_type === 'builtins.End') {
              // End node after SetState - return workflow and break
              code += `\n${indent}return workflow`
              break
            }
            nodeId = nextSetStateEdge.target_node_id
            nextPort = 'on_result'
            continue
          } else {
            // No next node after SetState, return workflow
            code += `\n${indent}return workflow`
            break
          }
        } else if (node.node_type === 'builtins.tool.FileSearch') {
          const fileSearchCode = generateFileSearchNodeCode(node)
          // generateFileSearchNodeCode returns code with leading newline and 2-space indent
          const fileSearchLines = fileSearchCode.split('\n')
          const adjustedFileSearchCode = fileSearchLines
            .map((line) => {
              if (!line) return ''
              return line.replace(/^  /, indent)
            })
            .join('\n')
          code += adjustedFileSearchCode
          const nextFileSearchEdge = edges.find(
            (e) => e.source_node_id === nodeId && e.source_port_id === 'out'
          )
          if (nextFileSearchEdge) {
            const nextNode = nodes.find(
              (n) => n.id === nextFileSearchEdge.target_node_id
            )
            if (nextNode?.node_type === 'builtins.End') {
              code += `\n${indent}return filesearch_result`
              break
            }
            nodeId = nextFileSearchEdge.target_node_id
            nextPort = 'on_result'
            continue
          } else {
            code += `\n${indent}return filesearch_result`
            break
          }
        } else if (node.node_type === 'builtins.Guardrails') {
          const guardrailsCode = generateGuardrailsNodeCode(
            node,
            'guardrails_config',
            0,
            'agent_result'
          )
          const guardrailsLines = guardrailsCode.split('\n')
          const adjustedGuardrailsCode = guardrailsLines
            .map((line) => {
              if (!line) return ''
              return line.replace(/^  /, indent)
            })
            .join('\n')

          // Check if continue_on_error is enabled
          const continueOnError = node.config?.continue_on_error === true
          let finalGuardrailsCode = adjustedGuardrailsCode

          if (
            continueOnError &&
            !adjustedGuardrailsCode.includes('return { "message"')
          ) {
            // Add missing error return statement for continue_on_error case
            finalGuardrailsCode += `\n${indent}  return { "message": "An error has occurred while running the guardrails node" }`
          }

          code += finalGuardrailsCode
          // Guardrails code already contains return statements, so break here
          break
        } else if (node.node_type === 'builtins.BinaryApproval') {
          // Handle UserApproval (BinaryApproval) node within If/Else branch
          const approvalConfig = node.config || {}
          const approvalMessage = approvalConfig.message?.expression || ''
          const pythonMessage = approvalMessage
            .replace(/workflow\.(\w+)/g, 'workflow["$1"]')
            .replace(/state\.(\w+)/g, 'state["$1"]')
            .trim()

          code += `\n${indent}approval_message = ${pythonMessage || '""'}`
          code += `\n${indent}`
          code += `\n${indent}if approval_request(approval_message):`

          // Find the approval branch (on_approve port)
          const approveEdge = edges.find(
            (e) =>
              e.source_node_id === nodeId && e.source_port_id === 'on_approve'
          )
          if (approveEdge) {
            let approveCode = traverseIfElseBranch(
              approveEdge.target_node_id,
              'on_result',
              indentLevel + 1
            )
            if (approveCode.trim()) {
              approveCode = approveCode.replace(/^\n/, '')
              const indentedApproveCode = approveCode
                .split('\n')
                .map((line) => {
                  if (!line.trim()) return line
                  return '  ' + line
                })
                .join('\n')
              code += '\n' + indentedApproveCode
            } else {
              code += `\n${indent}  pass`
            }
          } else {
            code += `\n${indent}  pass`
          }

          code += `\n${indent}else:`

          // Find the rejection branch (on_reject port)
          const rejectEdge = edges.find(
            (e) =>
              e.source_node_id === nodeId && e.source_port_id === 'on_reject'
          )
          if (rejectEdge) {
            let rejectCode = traverseIfElseBranch(
              rejectEdge.target_node_id,
              'on_result',
              indentLevel + 1
            )
            if (rejectCode.trim()) {
              rejectCode = rejectCode.replace(/^\n/, '')
              const indentedRejectCode = rejectCode
                .split('\n')
                .map((line) => {
                  if (!line.trim()) return line
                  return '  ' + line
                })
                .join('\n')
              code += '\n' + indentedRejectCode
            } else {
              code += `\n${indent}  pass`
            }
          } else {
            code += `\n${indent}  pass`
          }

          break
        } else if (node.node_type === 'builtins.End') {
          const endConfig = node.config?.expr
          if (endConfig) {
            const returnVar =
              endConfig.expression === 'workflow' ? 'workflow' : 'workflow'
            code += '\n' + indent + `return ${returnVar}`
          } else {
            code += '\n' + indent + 'return workflow'
          }
          break
        } else if (node.node_type === 'builtins.While') {
          // Handle While loop node within If/Else branch
          // indentLevel is already set correctly based on branch nesting
          code += generateWhileLoopNodeCode(node, indentLevel)
          break
        }

        const nextEdge = edges.find(
          (e) => e.source_node_id === nodeId && e.source_port_id === nextPort
        )
        if (!nextEdge) break

        nodeId = nextEdge.target_node_id
        const nextNode = nodes.find((n) => n.id === nodeId)
        nextPort = nextNode ? getOutputPort(nextNode.node_type) : 'on_result'
      }

      return code
    }

    // Check if we have If/Else starting workflow
    if (isIfElseWorkflow && currentNode?.node_type === 'builtins.Start') {
      const startEdge = edges.find((e) => e.source_node_id === currentNode!.id)
      if (startEdge) {
        const nextAfterStart = nodes.find(
          (n) => n.id === startEdge.target_node_id
        )

        if (nextAfterStart?.node_type === 'builtins.IfElse') {
          const allAgentNodes = nodes.filter(
            (n) => n.node_type === 'builtins.Agent'
          )
          const allAgentLabels = allAgentNodes.map((n) => n.label)

          for (let i = 0; i < allAgentNodes.length; i++) {
            const agentNode = allAgentNodes[i]
            if (agentIndex > 0) {
              topLevelCode += '\n\n'
            }
            const agentResult = generateAgentCode(
              agentNode,
              agentIndex,
              allAgentNodes.length,
              allAgentLabels
            )
            topLevelCode += agentResult.agentCode
            allSchemaModels.push(...agentResult.schemaModels)
            agentIndex++
          }

          const ifElseResult = traverseIfElseBranch(
            nextAfterStart.id,
            'case-0',
            0
          )

          mainFunctionBody += ifElseResult
          currentNode = undefined
        }
      }
    }

    // Step 1: Pre-generate all Agent declarations (main + While bodies)
    // This ensures all agents are declared at the top level before any code references them
    if (hasAgent && edges.length > 0 && whileBodyNodes.length > 0) {
      // Filter only Agent nodes from allNodesForDeclaration
      const agentNodes = allNodesForDeclaration.filter(
        (n) => n.node_type === 'builtins.Agent'
      )
      const allAgentLabels = agentNodes.map((n) => n.label)

      for (let i = 0; i < agentNodes.length; i++) {
        const agentNode = agentNodes[i]
        if (i > 0) {
          topLevelCode += '\n\n'
        }
        const agentResult = generateAgentCode(
          agentNode,
          i,
          agentNodes.length,
          allAgentLabels
        )
        topLevelCode += agentResult.agentCode
        allSchemaModels.push(...agentResult.schemaModels)
      }
      // Mark agents as pre-generated
      agentIndex = agentNodes.length
    }

    // Flag to indicate agents were pre-generated
    const agentsPreGenerated =
      hasAgent && edges.length > 0 && whileBodyNodes.length > 0

    // Traverse nodes
    while (currentNode) {
      const edge = edges.find((e) => e.source_node_id === currentNode!.id)
      if (!edge) break

      const nextNode = nodes.find((n) => n.id === edge.target_node_id)
      if (!nextNode) break

      if (nextNode.node_type === 'builtins.Agent') {
        hasAgent = true
        // Count total Agent nodes in the workflow
        const totalAgentNodes = nodes.filter(
          (n) => n.node_type === 'builtins.Agent'
        ).length

        // Get all agent labels for mixed label detection
        const allAgentLabels = nodes
          .filter((n) => n.node_type === 'builtins.Agent')
          .map((n) => n.label)

        // Only generate agent definition if agents weren't pre-generated from While bodies
        if (!agentsPreGenerated) {
          // Add empty lines between agents
          if (agentIndex > 0) {
            topLevelCode += '\n\n'
          }
          const agentResult = generateAgentCode(
            nextNode,
            agentIndex,
            totalAgentNodes,
            allAgentLabels
          )
          topLevelCode += agentResult.agentCode
          allSchemaModels.push(...agentResult.schemaModels)
          agentIndex++
        }

        const hasTools = (nextNode.config?.tools || []).length > 0
        const hasJsonSchema =
          nextNode.config?.text?.format?.type === 'json_schema'
        const agentMessagesPythonList = (nextNode.config?.messages || [])
          .map((message: any) => {
            const role = message.role

            if (hasTools || hasJsonSchema) {
              // Multi-line format for agents with tools
              const content = message.content
                .map((c: any) => {
                  if (c.type === 'input_text') {
                    return `{\n            "type": "input_text",\n            "text": "${c.text}"\n          }`
                  } else if (c.type === 'output_text') {
                    return `{\n            "type": "output_text",\n            "text": "${c.text}"\n          }`
                  }
                  return ''
                })
                .filter(Boolean)
                .join(',\n          ')

              // Handle id field if present - for assistant messages, add id: None if not present
              let idField = ''
              if (message.id !== undefined) {
                idField = `"id": ${message.id === null ? 'None' : `"${message.id}"`},\n        `
              } else if (role === 'assistant') {
                idField = `"id": None,\n        `
              }

              return `{\n        ${idField}"role": "${role}",\n        "content": [\n          ${content}\n        ]\n      }`
            } else {
              // Single-line format for agents without tools
              const content = message.content
                .map((c: any) => {
                  if (c.type === 'input_text') {
                    return `{"type": "input_text", "text": "${c.text}"}`
                  } else if (c.type === 'output_text') {
                    return `{"type": "output_text", "text": "${c.text}"}`
                  }
                  return ''
                })
                .filter(Boolean)
                .join(', ')

              return `{"role": "${role}", "content": [${content}]}`
            }
          })
          .filter(Boolean)

        const agentMessagesFormatted =
          agentMessagesPythonList.length > 0
            ? ',\n      ' + agentMessagesPythonList.join(',\n      ')
            : ''

        const agentVarName = generateAgentVarName(
          nextNode.label,
          agentIndex - 1,
          totalAgentNodes,
          allAgentLabels
        )

        // For default label "Agent", result variables use a different naming scheme
        // First agent uses "agent_result_temp", others use "agent_result_temp1", "agent_result_temp2", etc.
        const isDefaultLabel = nextNode.label.toLowerCase() === 'agent'
        const resultVarPrefix = isDefaultLabel
          ? 'agent_result'
          : `${agentVarName}_result`

        // Count how many "Agent" labels appear before this one (for result variable suffix)
        let defaultLabelCount = 0
        if (isDefaultLabel) {
          for (let i = 0; i < agentIndex - 1; i++) {
            if (allAgentLabels[i].toLowerCase() === 'agent') {
              defaultLabelCount++
            }
          }
        }
        const resultVarSuffix =
          isDefaultLabel && defaultLabelCount > 0
            ? String(defaultLabelCount)
            : ''

        // Check if there are more Agent nodes after this agent
        const hasNextAgentNode = edges.some((e) => {
          if (e.source_node_id === nextNode.id) {
            const targetNode = nodes.find((n) => n.id === e.target_node_id)
            return targetNode?.node_type === 'builtins.Agent'
          }
          return false
        })

        mainFunctionBody += `
  ${resultVarPrefix}_temp${resultVarSuffix} = await Runner.run(
    ${agentVarName},
    input=[
      *conversation_history${agentMessagesFormatted}
    ]
  )`

        // Extend conversation history if:
        // 1. There are more Agent nodes after this one, OR
        // 2. This is a single Agent workflow, OR
        // 3. This workflow has an End node (to keep history for final result)
        if (hasNextAgentNode || totalAgentNodes === 1 || hasEndNode) {
          mainFunctionBody += `

  conversation_history.extend([item.to_input_item() for item in ${resultVarPrefix}_temp${resultVarSuffix}.new_items])`
        }

        // Add newline before result assignment if conversation_history was extended
        const needsNewline =
          hasNextAgentNode || totalAgentNodes === 1 || hasEndNode

        // Check if this agent has JSON schema output
        if (hasJsonSchema) {
          mainFunctionBody += needsNewline
            ? `

  ${resultVarPrefix}${resultVarSuffix} = {
    "output_text": ${resultVarPrefix}_temp${resultVarSuffix}.final_output.json(),
    "output_parsed": ${resultVarPrefix}_temp${resultVarSuffix}.final_output.model_dump()
  }`
            : `
  ${resultVarPrefix}${resultVarSuffix} = {
    "output_text": ${resultVarPrefix}_temp${resultVarSuffix}.final_output.json(),
    "output_parsed": ${resultVarPrefix}_temp${resultVarSuffix}.final_output.model_dump()
  }`
        } else {
          mainFunctionBody += needsNewline
            ? `

  ${resultVarPrefix}${resultVarSuffix} = {
    "output_text": ${resultVarPrefix}_temp${resultVarSuffix}.final_output_as(str)
  }`
            : `
  ${resultVarPrefix}${resultVarSuffix} = {
    "output_text": ${resultVarPrefix}_temp${resultVarSuffix}.final_output_as(str)
  }`
        }
      } else if (nextNode.node_type === 'builtins.tool.FileSearch') {
        // Handle FileSearch node
        mainFunctionBody += generateFileSearchNodeCode(
          nextNode,
          fileSearchIndex
        )
        fileSearchIndex++
      } else if (nextNode.node_type === 'builtins.Guardrails') {
        // Handle Guardrails node
        const rawLabel =
          nextNode.label
            ?.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/^_|_$/g, '') || 'guardrails'

        // For default labels, use guardrails_config, guardrails_config1, guardrails_config2, etc.
        // For custom labels, use {label}_config
        let guardrailsVarName: string
        if (rawLabel === 'guardrails') {
          // Count how many default-label Guardrails nodes appear before this one
          let defaultLabelCount = 0
          const guardrailsNodes = nodes.filter(
            (n) => n.node_type === 'builtins.Guardrails'
          )
          for (let i = 0; i < guardrailsNodes.length; i++) {
            const nodeRawLabel =
              guardrailsNodes[i]?.label
                ?.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .replace(/^_|_$/g, '') || 'guardrails'
            if (
              nodeRawLabel === 'guardrails' &&
              guardrailsNodes[i].id === nextNode.id
            ) {
              break
            }
            if (nodeRawLabel === 'guardrails') {
              defaultLabelCount++
            }
          }
          guardrailsVarName =
            defaultLabelCount === 0
              ? 'guardrails_config'
              : `guardrails_config${defaultLabelCount}`
        } else {
          guardrailsVarName = `${rawLabel}_config`
        }

        // Determine the previous guardrails result variable
        const previousResultVar =
          guardrailsIndex > 0
            ? `guardrails_result${guardrailsIndex - 1 > 0 ? guardrailsIndex - 1 : ''}`
            : undefined

        // Check if the previous node is an Agent to determine input variable
        let inputVarForGuardrails: string | undefined = undefined
        if (currentNode && currentNode.node_type === 'builtins.Agent') {
          // Find which agent this is (to determine agent_result or agent_result1, etc.)
          const allAgentNodes = nodes.filter(
            (n) => n.node_type === 'builtins.Agent'
          )
          const agentIndex = allAgentNodes.findIndex(
            (n) => n.id === currentNode!.id
          )
          inputVarForGuardrails =
            agentIndex === 0 ? 'agent_result' : `agent_result${agentIndex}`
        }

        // Generate guardrails code with potential input override
        let guardrailsCode = generateGuardrailsNodeCode(
          nextNode,
          guardrailsVarName,
          guardrailsIndex,
          previousResultVar
        )

        // If the input was from an Agent, replace input.output_text with agent_result["output_text"]
        if (inputVarForGuardrails) {
          guardrailsCode = guardrailsCode.replace(
            /input\.output_text/g,
            `${inputVarForGuardrails}["output_text"]`
          )
        }

        // For the first guardrails node, add its code directly
        // For subsequent nodes, they should be in the else block
        if (guardrailsIndex === 0) {
          mainFunctionBody += guardrailsCode
        } else {
          // Replace the last "else:\n    return" with "else:" followed by the new code
          const lastElseIndex = mainFunctionBody.lastIndexOf('else:')
          if (lastElseIndex !== -1) {
            // Find the corresponding return statement
            const afterElse = mainFunctionBody.substring(lastElseIndex)
            const returnMatch = afterElse.match(/return\s+\w+/)
            if (returnMatch) {
              const beforeElse = mainFunctionBody.substring(0, lastElseIndex)
              const afterReturn = mainFunctionBody.substring(
                lastElseIndex +
                  returnMatch[0].length +
                  afterElse.indexOf(returnMatch[0])
              )
              mainFunctionBody =
                beforeElse +
                'else:' +
                guardrailsCode.substring(guardrailsCode.indexOf('\n')) +
                afterReturn
            }
          }
        }

        guardrailsIndex++
      } else if (nextNode.node_type === 'builtins.IfElse') {
        // Handle If/Else node (non-nested, direct mode)
        let ifElseCode = generateIfElseNodeCode(nextNode, false, 0)

        // Replace input.output_text with the last agent's result if available
        // Look back through the code to find the most recent agent_result variable
        if (mainFunctionBody.includes('agent_result')) {
          const agentResultMatch = mainFunctionBody.match(
            /agent_result(\d*)(?:\s|=|,)/
          )
          const lastAgentResultVar = agentResultMatch
            ? `agent_result${agentResultMatch[1] || ''}`
            : 'agent_result'
          ifElseCode = ifElseCode.replace(
            /input\.output_text/g,
            `${lastAgentResultVar}["output_text"]`
          )
        }

        mainFunctionBody += ifElseCode
      } else if (nextNode.node_type === 'builtins.Transform') {
        // Handle Transform node
        mainFunctionBody += generateTransformNodeCode(nextNode)
      } else if (nextNode.node_type === 'builtins.SetState') {
        // Handle SetState node
        mainFunctionBody += generateSetStateNodeCode(nextNode)
      } else if (nextNode.node_type === 'builtins.While') {
        // Handle While loop node
        const bodyCode = generateWhileBodyCode(
          nextNode.config?.body,
          0,
          allNodesForDeclaration
        )
        mainFunctionBody += generateWhileLoopNodeCode(nextNode, 0, bodyCode)
      } else if (nextNode.node_type === 'builtins.MCP') {
        // Handle MCP node
        mainFunctionBody += generateMcpNodeCode(nextNode, mcpIndex)
        mcpIndex++
      } else if (nextNode.node_type === 'builtins.BinaryApproval') {
        // Handle BinaryApproval node
        // Check if there's a chain of User Approval nodes connected via on_approve
        let approvalChain: WorkflowNode[] = [nextNode]
        let currentApprovalNode: WorkflowNode | undefined = nextNode

        while (currentApprovalNode) {
          const approveEdge = edges.find(
            (e) =>
              e.source_node_id === currentApprovalNode!.id &&
              e.source_port_id === 'on_approve'
          )
          if (!approveEdge) break

          const nextApprovalNode = nodes.find(
            (n) => n.id === approveEdge.target_node_id
          )
          if (
            nextApprovalNode &&
            nextApprovalNode.node_type === 'builtins.BinaryApproval'
          ) {
            approvalChain.push(nextApprovalNode)
            currentApprovalNode = nextApprovalNode
          } else {
            break
          }
        }

        // If single User Approval (no chain), check if there are agents in approval branch
        if (approvalChain.length === 1) {
          // Check if this approval has agents in its branch
          const {
            approvals: approvalsWithAgents,
            agents: agentsInChain,
            hasIfElse: hasIfElseInChain,
          } = collectApprovalChainWithAgents(nextNode, edges, nodes)

          if (
            approvalsWithAgents.length > 1 ||
            (agentsInChain.length > 0 && hasIfElseInChain)
          ) {
            // Complex approval with agents - use new nested generation logic
            hasAgent = true

            // Collect all agents recursively, including those in If/Else branches
            const approveEdge = edges.find(
              (e) =>
                e.source_node_id === nextNode.id &&
                e.source_port_id === 'on_approve'
            )
            const firstAgentAfterApproval =
              approveEdge &&
              nodes.find((n) => n.id === approveEdge.target_node_id)
            const allAgentsIncludingNested = collectAllAgentsRecursively(
              firstAgentAfterApproval,
              edges,
              nodes
            )

            // Generate all agent definitions first
            for (
              let agentIdx = 0;
              agentIdx < allAgentsIncludingNested.length;
              agentIdx++
            ) {
              const agentNode = allAgentsIncludingNested[agentIdx]
              const agentResult = generateAgentCode(
                agentNode,
                agentIdx,
                allAgentsIncludingNested.length,
                allAgentsIncludingNested.map((n) => n.label)
              )
              topLevelCode += agentResult.agentCode
              // Add extra blank line between agent definitions
              if (agentIdx < allAgentsIncludingNested.length - 1) {
                topLevelCode += '\n\n'
              }
              allSchemaModels.push(...agentResult.schemaModels)
            }

            // Generate all approval_request function definitions
            for (let i = 0; i < approvalsWithAgents.length; i++) {
              const approvalVarName =
                i === 0 ? 'approval_request' : `approval_request${i}`
              if (!topLevelCode.includes(`def ${approvalVarName}(`)) {
                topLevelCode += `\n\ndef ${approvalVarName}(message: str):\n  # TODO: Implement\n  return True`
                // Add blank line only after the last approval function
                if (i === approvalsWithAgents.length - 1 && hasIfElseInChain) {
                  topLevelCode += '\n'
                }
              }
            }

            // Generate nested approval code
            const generateNestedApprovals = (
              approvalIndex: number,
              indentLevel: number
            ): string => {
              let code = ''
              if (approvalIndex >= approvalsWithAgents.length) return code

              const approval = approvalsWithAgents[approvalIndex]
              const config = approval.config || {}
              const message = config.message || ''
              const approvalVarName =
                approvalIndex === 0
                  ? 'approval_request'
                  : `approval_request${approvalIndex}`
              const messageVar = `approval_message${approvalIndex > 0 ? approvalIndex : ''}`
              const indent = '  '.repeat(indentLevel)
              const innerIndent = '  '.repeat(indentLevel + 1)
              const nestedIndent = '  '.repeat(indentLevel + 2)

              code += `
${indent}${messageVar} = "${message}"

${indent}if ${approvalVarName}(${messageVar}):`

              // Check if there's an agent after this approval
              const approveEdge = edges.find(
                (e) =>
                  e.source_node_id === approval.id &&
                  e.source_port_id === 'on_approve'
              )

              if (approveEdge) {
                const approveNode = nodes.find(
                  (n) => n.id === approveEdge.target_node_id
                )
                if (approveNode && approveNode.node_type === 'builtins.Agent') {
                  // Generate agent execution code
                  const allAgents = nodes.filter(
                    (n) => n.node_type === 'builtins.Agent'
                  )
                  const agentIndex = allAgents.findIndex(
                    (n) => n.id === approveNode.id
                  )
                  const agentVar =
                    agentIndex === 0 ? 'agent' : `agent${agentIndex}`
                  const tempVar = `agent_result_temp${agentIndex === 0 ? '' : agentIndex}`
                  const resultVar = `agent_result${agentIndex === 0 ? '' : agentIndex}`

                  // Check if Agent has messages configured
                  const agentMessages = approveNode.config?.messages || []
                  const hasMessages = agentMessages.length > 0
                  let inputContent = ''
                  if (hasMessages) {
                    inputContent = `
${nestedIndent}    *conversation_history,
${nestedIndent}    {
${nestedIndent}      "role": "user",
${nestedIndent}      "content": [
${nestedIndent}        {
${nestedIndent}          "type": "input_text",
${nestedIndent}          "text": "User Instruction"
${nestedIndent}        }
${nestedIndent}      ]
${nestedIndent}    }`
                  } else {
                    inputContent = `
${nestedIndent}    *conversation_history`
                  }

                  code += `
${nestedIndent}${tempVar} = await Runner.run(
${nestedIndent}  ${agentVar},
${nestedIndent}  input=[${inputContent}
${nestedIndent}  ]
${nestedIndent})

${nestedIndent}conversation_history.extend([item.to_input_item() for item in ${tempVar}.new_items])

${nestedIndent}${resultVar} = {
${nestedIndent}  "output_text": ${tempVar}.final_output_as(str)
${nestedIndent}}`

                  // Check what's after the agent
                  const agentEdge = edges.find(
                    (e) => e.source_node_id === approveNode.id
                  )
                  if (agentEdge) {
                    const nodeAfterAgent = nodes.find(
                      (n) => n.id === agentEdge.target_node_id
                    )
                    if (
                      nodeAfterAgent &&
                      nodeAfterAgent.node_type === 'builtins.BinaryApproval'
                    ) {
                      // Another approval follows - recurse
                      const nextApprovalIndex = approvalsWithAgents.findIndex(
                        (n) => n.id === nodeAfterAgent.id
                      )
                      if (nextApprovalIndex > approvalIndex) {
                        code += generateNestedApprovals(
                          nextApprovalIndex,
                          indentLevel + 2
                        )
                      }
                    } else if (
                      nodeAfterAgent &&
                      nodeAfterAgent.node_type === 'builtins.IfElse'
                    ) {
                      // If/Else node follows - generate it nested with proper content
                      const ifElseContentCode = generateNestedIfElseContent(
                        nodeAfterAgent,
                        resultVar,
                        0,
                        indentLevel + 2,
                        edges,
                        nodes
                      )
                      code += ifElseContentCode
                    } else if (
                      nodeAfterAgent &&
                      nodeAfterAgent.node_type === 'builtins.End'
                    ) {
                      code += `
${nestedIndent}return ${resultVar}`
                    }
                  }
                }
              }

              // Else branch
              code += `
${indent}else:
${nestedIndent}pass`

              return code
            }

            mainFunctionBody += generateNestedApprovals(0, 1)
            break
          } else {
            // Simple approval without agents - use old logic
            const result = generateBinaryApprovalNodeCode(
              nextNode,
              edges,
              nodes,
              generateAgentCode
            )

            mainFunctionBody += result.mainFunctionBody
            topLevelCode += result.topLevelCode
            if (result.hasAgent) {
              hasAgent = true
            }
            allSchemaModels.push(...result.schemaModels)

            if (result.shouldBreak) {
              break
            }
          }
        } else {
          // Handle chain of directly-connected User Approval nodes (approvalChain.length > 1)
          // Check if there's an Agent at the end of the chain
          const lastApprovalNode = approvalChain[approvalChain.length - 1]
          const lastApproveEdge = edges.find(
            (e) =>
              e.source_node_id === lastApprovalNode.id &&
              e.source_port_id === 'on_approve'
          )

          const finalNode = lastApproveEdge
            ? nodes.find((n) => n.id === lastApproveEdge.target_node_id)
            : null
          let agentCode = ''
          let agentSchemaModels: string[] = []

          if (finalNode && finalNode.node_type === 'builtins.Agent') {
            hasAgent = true
            const agentResult = generateAgentCode(finalNode)
            agentCode = agentResult.agentCode
            agentSchemaModels = agentResult.schemaModels
          }

          // Add Agent definition first
          if (agentCode) {
            topLevelCode += agentCode
            allSchemaModels.push(...agentSchemaModels)
          }

          // Generate all approval_request functions
          for (let i = 0; i < approvalChain.length; i++) {
            const approvalVarName =
              i === 0 ? 'approval_request' : `approval_request${i}`
            if (!topLevelCode.includes(`def ${approvalVarName}(`)) {
              topLevelCode += `\n\ndef ${approvalVarName}(message: str):\n  # TODO: Implement\n  return True`
            }
          }

          // Helper function to traverse User Approval branches
          const traverseUserApprovalBranch = (
            startIndex: number,
            indentLevel: number
          ): string => {
            let code = ''

            if (startIndex >= approvalChain.length) {
              // Reached end of chain, generate Agent execution code
              if (agentCode) {
                const indent = '  '.repeat(indentLevel)
                code += `
${indent}agent_result_temp = await Runner.run(
${indent}  agent,
${indent}  input=[
${indent}    *conversation_history
${indent}  ]
${indent})

${indent}conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])

${indent}agent_result = {
${indent}  "output_text": agent_result_temp.final_output_as(str)
${indent}}
${indent}return agent_result`
              }
              return code
            }

            const approvalNode = approvalChain[startIndex]
            const config = approvalNode.config || {}
            const message = config.message || ''
            const approvalVarName =
              startIndex === 0
                ? 'approval_request'
                : `approval_request${startIndex}`
            const approvalMessageVar = `approval_message${startIndex > 0 ? startIndex : ''}`
            const currentIndent = '  '.repeat(indentLevel)
            const elseReturnIndent = '  '.repeat(indentLevel + 2)

            code += `
${currentIndent}${approvalMessageVar} = "${message}"

${currentIndent}if ${approvalVarName}(${approvalMessageVar}):`

            // Recursively add next approval or final content
            code += traverseUserApprovalBranch(startIndex + 1, indentLevel + 2)

            code += `
${currentIndent}else:
${elseReturnIndent}return workflow`

            return code
          }

          // Generate the nested approval structure
          mainFunctionBody += traverseUserApprovalBranch(0, 1)

          break
        }
      }

      currentNode = nextNode
    }

    // Add return statement if there's an End node
    // But skip if we already handled complex branching (User approval with multiple paths)
    // or If/Else workflows, or if there are no edges (disconnected workflow)
    const hasComplexBranching =
      nodes.some((n) => n.node_type === 'builtins.BinaryApproval') &&
      edges.some(
        (e) =>
          e.source_port_id === 'on_approve' || e.source_port_id === 'on_reject'
      )

    if (
      hasEndNode &&
      !hasComplexBranching &&
      !isIfElseWorkflow &&
      edges.length > 0
    ) {
      // Check if End node has workflowOutput schema
      const endNode = nodes.find((n) => n.node_type === 'builtins.End')
      const workflowOutput =
        workflow.ui_metadata?.dataByNodeId?.[endNode?.id || '']?.workflowOutput

      if (workflowOutput?.schema) {
        // Generate end_result from workflowOutput schema
        const endResultSchema = generateEndResultFromSchema(
          workflowOutput.schema,
          2
        )
        mainFunctionBody += `\n  end_result = ${endResultSchema}\n  return end_result`
      } else if (hasAgent) {
        // If there's an agent, return the last agent's result
        const agentNodes = nodes.filter((n) => n.node_type === 'builtins.Agent')
        if (agentNodes.length > 0) {
          const lastAgentNode = agentNodes[agentNodes.length - 1]
          const allAgentLabels = agentNodes.map((n) => n.label)
          const lastAgentVarName = generateAgentVarName(
            lastAgentNode.label,
            agentNodes.length - 1,
            agentNodes.length,
            allAgentLabels
          )

          // For default label "Agent", result variables use a different naming scheme
          const isDefaultLabel = lastAgentNode.label.toLowerCase() === 'agent'
          const lastResultVarPrefix = isDefaultLabel
            ? 'agent_result'
            : `${lastAgentVarName}_result`

          // Count how many "Agent" labels appear before the last one
          let lastDefaultLabelCount = 0
          if (isDefaultLabel) {
            for (let i = 0; i < agentNodes.length - 1; i++) {
              if (allAgentLabels[i].toLowerCase() === 'agent') {
                lastDefaultLabelCount++
              }
            }
          }
          const lastResultVarSuffix =
            isDefaultLabel && lastDefaultLabelCount > 0
              ? String(lastDefaultLabelCount)
              : ''

          mainFunctionBody += `\n  return ${lastResultVarPrefix}${lastResultVarSuffix}`
        } else {
          // No top-level agents found - check if agents are inside While loops
          const hasWhileWithAgents = whileNodes.length > 0
          if (hasWhileWithAgents) {
            mainFunctionBody += `\n  return workflow`
          } else {
            mainFunctionBody += `\n  return agent_result`
          }
        }
      } else if (hasFileSearch) {
        // If there's FileSearch, return the last FileSearch result
        const fileSearchNodes = nodes.filter(
          (n) => n.node_type === 'builtins.tool.FileSearch'
        )
        if (fileSearchNodes.length > 0) {
          const lastFileSearchIndex = fileSearchNodes.length - 1
          const lastFileSearchVarName =
            lastFileSearchIndex === 0
              ? 'filesearch_result'
              : `filesearch_result${lastFileSearchIndex}`
          mainFunctionBody += `\n  return ${lastFileSearchVarName}`
        } else {
          mainFunctionBody += `\n  return workflow`
        }
      } else {
        // If no agent or FileSearch, return workflow
        mainFunctionBody += `\n  return workflow`
      }
    }

    let importCode = ''
    // For disconnected workflows (no edges), prioritize Guardrails imports
    if (edges.length === 0 && hasGuardrails) {
      importCode = `from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from agents import Agent, ModelSettings, TResponseInputItem
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel`
    } else if (hasAgent) {
      // Check if any agent has tools
      const hasTools = nodes.some(
        (node) =>
          node.node_type === 'builtins.Agent' &&
          node.config?.tools &&
          node.config.tools.length > 0
      )

      // Check if any agent has JSON schema output
      const hasJsonSchema = nodes.some(
        (node) =>
          node.node_type === 'builtins.Agent' &&
          node.config?.text?.format?.type === 'json_schema'
      )

      // Check if any agent has web_search tools
      const hasWebSearch = webSearchTools.length > 0

      // Check if any agent has MCP
      const hasMcp = nodes.some((node) => node.node_type === 'builtins.MCP')

      if (hasJsonSchema) {
        if (hasWebSearch) {
          importCode = `from agents import WebSearchTool, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning`
        } else {
          importCode = `from pydantic import BaseModel
from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning`
        }
      } else if (hasTools) {
        if (hasWebSearch) {
          importCode = `from agents import WebSearchTool, function_tool, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel`
        } else {
          importCode = `from agents import function_tool, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel`
        }
      } else {
        if (hasWebSearch) {
          importCode = `from agents import WebSearchTool, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel`
        } else {
          importCode = `from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel`
        }
      }

      // Add Guardrails imports if needed (when Agent + Guardrails)
      if (hasGuardrails) {
        importCode =
          `from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
` + importCode
      } else if (hasFileSearch) {
        importCode =
          `from openai import AsyncOpenAI
from types import SimpleNamespace
` + importCode
      }
    } else if (hasFileSearch) {
      importCode = `from openai import AsyncOpenAI
from types import SimpleNamespace
from pydantic import BaseModel
from agents import TResponseInputItem`
    } else if (hasTopLevelGuardrails) {
      importCode = `from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from pydantic import BaseModel
from agents import TResponseInputItem`
    } else {
      importCode = `from pydantic import BaseModel
from agents import TResponseInputItem`
    }

    // Add MCP imports if needed
    if (hasMcp) {
      importCode =
        `from mcp.client import Client, StdioClientTransport, SSEClientTransport
` + importCode
    }

    const mainFunction = `
# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):${mainFunctionBody}`

    let finalCode = importCode

    // Add WebSearchTool definitions if any agent has web_search tools
    if (webSearchTools.length > 0) {
      finalCode += `\n\n# Tool definitions`
      webSearchTools.forEach((tool, index) => {
        const varName =
          index === 0 ? 'web_search_preview' : `web_search_preview${index + 1}`
        const searchContextSize = tool.search_context_size || 'medium'
        const userLocation = tool.user_location || { type: 'approximate' }
        const userLocationStr = JSON.stringify(userLocation, null, 2)

        finalCode += `\n${varName} = WebSearchTool(
  search_context_size="${searchContextSize}",
  user_location={
    "type": "approximate"
  }
)`
      })
    }

    // Add client initialization for file search and guardrails
    if (hasFileSearch || hasGuardrails) {
      finalCode += `\n\n# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)`
    }

    // Add if-else logic

    // Add guardrails configuration and utils
    if (hasGuardrails) {
      // Find all guardrails nodes - including those in While bodies
      const guardrailsNodes = [
        ...nodes.filter((n) => n.node_type === 'builtins.Guardrails'),
        ...whileNodes.flatMap(
          (w) =>
            w.config?.body?.nodes?.filter(
              (n: WorkflowNode) => n.node_type === 'builtins.Guardrails'
            ) || []
        ),
      ]

      finalCode += `\n# Guardrails definitions`

      // Generate configuration for each guardrails node
      guardrailsNodes.forEach((guardrailsNode, index) => {
        const guardrailsConfig = guardrailsNode?.config?.guardrails || []

        // Generate variable name based on node label
        const rawLabel =
          guardrailsNode?.label
            ?.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/^_|_$/g, '') || 'guardrails'

        // For default labels, use guardrails_config, guardrails_config1, guardrails_config2, etc.
        // For custom labels, use {label}_config
        let guardrailsVarName: string
        if (rawLabel === 'guardrails') {
          // Count how many default-label Guardrails nodes appear before this one
          let defaultLabelCount = 0
          for (let i = 0; i < index; i++) {
            const nodeRawLabel =
              guardrailsNodes[i]?.label
                ?.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .replace(/^_|_$/g, '') || 'guardrails'
            if (nodeRawLabel === 'guardrails') {
              defaultLabelCount++
            }
          }
          guardrailsVarName =
            defaultLabelCount === 0
              ? 'guardrails_config'
              : `guardrails_config${defaultLabelCount}`
        } else {
          guardrailsVarName = `${rawLabel}_config`
        }

        // Generate guardrails configuration
        const guardrailsConfigStr = guardrailsConfig
          .map((guardrail: any) => {
            if (guardrail.type === 'moderation') {
              const categories = guardrail.config?.categories || []
              const categoriesStr = categories
                .map((cat: string) => `          "${cat}"`)
                .join(',\n')
              return `    {
      "name": "Moderation",
      "config": {
        "categories": [
${categoriesStr}
        ]
      }
    }`
            } else if (guardrail.type === 'pii') {
              const entities = guardrail.config?.entities || []
              const entitiesStr = entities
                .map((entity: string) => `          "${entity}"`)
                .join(',\n')
              return `    {
      "name": "Contains PII",
      "config": {
        "block": ${guardrail.config?.block === true ? 'True' : 'False'},
        "entities": [
${entitiesStr}
        ]
      }
    }`
            } else if (guardrail.type === 'jailbreak') {
              return `    {
      "name": "Jailbreak",
      "config": {
        "model": "${guardrail.config?.model || 'gpt-4o-mini'}",
        "confidence_threshold": ${guardrail.config?.confidence_threshold || 0.7}
      }
    }`
            }
            return `    {
      "name": "${guardrail.type || 'Unknown'}",
      "config": ${JSON.stringify(guardrail.config || {})}
    }`
          })
          .join(',\n')

        finalCode += `
${guardrailsVarName} = {
  "guardrails": [
${guardrailsConfigStr}
  ]
}`
      })

      finalCode += `
# Guardrails utils

def guardrails_has_tripwire(results):
    return any(getattr(r, "tripwire_triggered", False) is True for r in (results or []))

def get_guardrail_checked_text(results, fallback_text):
    for r in (results or []):
        info = getattr(r, "info", None) or {}
        if isinstance(info, dict) and ("checked_text" in info):
            return info.get("checked_text") or fallback_text
    return fallback_text

def build_guardrail_fail_output(results):
    failures = []
    for r in (results or []):
        if getattr(r, "tripwire_triggered", False):
            info = getattr(r, "info", None) or {}
            failure = {
                "guardrail_name": info.get("guardrail_name"),
            }
            for key in ("flagged", "confidence", "threshold", "hallucination_type", "hallucinated_statements", "verified_statements"):
                if key in (info or {}):
                    failure[key] = info.get(key)
            failures.append(failure)
    return {"failed": len(failures) > 0, "failures": failures}`
    }

    // Add schema models if any
    if (allSchemaModels.length > 0) {
      finalCode += `\n\n${allSchemaModels.join('\n\n\n')}`
    }

    if (topLevelCode) {
      // The agent case expects one newline after imports
      if (allSchemaModels.length > 0) {
        finalCode += `\n\n\n${topLevelCode}`
      } else if (hasGuardrails || hasFileSearch) {
        // When guardrails or file search is present, topLevelCode already contains definitions
        // Just add one newline instead of two to avoid extra blank lines
        finalCode += `\n${topLevelCode}`
      } else {
        finalCode += `\n\n${topLevelCode}`
      }
    }

    // Add pydantic model with appropriate spacing
    // Add extra newline when we have topLevelCode (Agents) with FileSearch
    const needsExtraNewline =
      topLevelCode && hasFileSearch && !hasGuardrails && !hasTopLevelGuardrails
    if (hasFileSearch || hasTopLevelGuardrails) {
      finalCode += needsExtraNewline
        ? `\n\n${pydanticModel}`
        : `\n${pydanticModel}`
    } else {
      finalCode += `\n\n${pydanticModel}`
    }
    finalCode += `\n\n${mainFunction}`

    // Ensure approval_request function is defined if used in code
    if (
      finalCode.includes('approval_request(') &&
      !finalCode.includes('def approval_request(')
    ) {
      // Find where to insert it - after Agent definitions but before the class definition
      const pydanticClassIndex = finalCode.indexOf('class WorkflowInput')
      if (pydanticClassIndex > 0) {
        const insertPoint = finalCode.lastIndexOf('\n\n', pydanticClassIndex)
        if (insertPoint > 0) {
          const beforeInsert = finalCode.substring(0, insertPoint)
          const afterInsert = finalCode.substring(insertPoint)
          finalCode = `${beforeInsert}\n\ndef approval_request(message: str):\n  # TODO: Implement\n  return True${afterInsert}`
        }
      }
    }

    return { code: finalCode, error: '' }
  } catch (error) {
    return {
      code: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
