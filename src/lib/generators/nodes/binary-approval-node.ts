import { Edge, WorkflowNode } from '../../types/workflow'

export function generateBinaryApprovalNodeCode(
  node: WorkflowNode,
  edges: Edge[],
  nodes: WorkflowNode[],
  generateAgentCode: (agentNode: WorkflowNode) => {
    agentCode: string
    schemaModels: string[]
  },
  useTemplate: boolean = false,
  indentLevel: number = 0
): {
  mainFunctionBody: string
  topLevelCode: string
  hasAgent: boolean
  schemaModels: string[]
  shouldBreak: boolean
} {
  const config = node.config || {}
  const message = config.message || ''

  // Find the edges for approve and reject paths
  const approveEdge = edges.find(
    (e) => e.source_node_id === node.id && e.source_port_id === 'on_approve'
  )
  const rejectEdge = edges.find(
    (e) => e.source_node_id === node.id && e.source_port_id === 'on_reject'
  )

  let mainFunctionBody = ''
  let topLevelCode = ''
  let hasAgent = false
  let schemaModels: string[] = []
  let shouldBreak = false

  // Check if this is a complex workflow with branching
  if (approveEdge && rejectEdge) {
    // In template mode, generate placeholder structure
    if (useTemplate) {
      const baseIndent = '  '.repeat(indentLevel + 1)
      const approvalIndex = indentLevel // Use indentLevel as the approval index for naming
      const approvalVarName =
        approvalIndex === 0
          ? 'approval_request'
          : `approval_request${approvalIndex}`
      const approvalMessageVar = `approval_message${approvalIndex > 0 ? approvalIndex : ''}`

      mainFunctionBody += `
${baseIndent}${approvalMessageVar} = "${message}"

${baseIndent}if ${approvalVarName}(${approvalMessageVar}):\n${baseIndent}  {CONTENT_APPROVE}
${baseIndent}else:\n${baseIndent}  {CONTENT_REJECT}`

      shouldBreak = false
    } else {
      // Original logic for non-template mode
      // Process approve path first to generate Agent code
      const approveNode = nodes.find((n) => n.id === approveEdge.target_node_id)
      if (approveNode) {
        // Process the approve path (usually Agent)
        if (approveNode.node_type === 'builtins.Agent') {
          hasAgent = true
          const agentResult = generateAgentCode(approveNode)
          topLevelCode += agentResult.agentCode
          schemaModels.push(...agentResult.schemaModels)
        }
      }

      // Generate approval_request function after Agent
      if (!topLevelCode.includes('def approval_request')) {
        topLevelCode += `

def approval_request(message: str):
  # TODO: Implement
  return True`
      }

      // Complex workflow with conditional branching
      mainFunctionBody += `
  approval_message = "${message}"

  if approval_request(approval_message):`

      // Generate Agent running code
      if (approveNode && approveNode.node_type === 'builtins.Agent') {
        // Check if Agent has messages configured
        const agentMessages = approveNode.config?.messages || []
        const hasMessages = agentMessages.length > 0

        let inputArray = '*conversation_history'
        if (hasMessages) {
          inputArray += `,
          {
            "role": "user",
            "content": [
              {
                "type": "input_text",
                "text": "User Instruction"
              }
            ]
          }`
        }

        mainFunctionBody += `
      agent_result_temp = await Runner.run(
        agent,
        input=[
          ${inputArray}
        ]
      )

      conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])

      agent_result = {
        "output_text": agent_result_temp.final_output_as(str)
      }`

        // Check if there's an End node after Agent
        const agentEdge = edges.find((e) => e.source_node_id === approveNode.id)
        if (agentEdge) {
          const endNode = nodes.find((n) => n.id === agentEdge.target_node_id)
          if (endNode && endNode.node_type === 'builtins.End') {
            mainFunctionBody += `
      return agent_result`
          }
        }
      }

      mainFunctionBody += `
  else:`

      // Process reject path
      const rejectNode = nodes.find((n) => n.id === rejectEdge.target_node_id)
      if (rejectNode && rejectNode.node_type === 'builtins.End') {
        mainFunctionBody += `
      return workflow`
      }

      mainFunctionBody += `
`

      // Break out of the main traversal loop since we handled the branching
      shouldBreak = true
    }
  } else {
    // Simple workflow without branching
    // Generate approval_request function if not already generated
    if (!topLevelCode.includes('def approval_request')) {
      topLevelCode += `def approval_request(message: str):
  # TODO: Implement
  return True`
    }

    mainFunctionBody += `
  approval_message = "${message}"

  if approval_request(approval_message):
      pass
  else:
      pass`
  }

  return {
    mainFunctionBody,
    topLevelCode,
    hasAgent,
    schemaModels,
    shouldBreak,
  }
}
