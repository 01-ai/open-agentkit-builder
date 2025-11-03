import { type Edge, type Node } from '@xyflow/react'
import type { WorkflowOutput } from './export-workflow'
import { getSourceHandles, getTargetHandle } from '@/lib/nodes/node-handles'

// Map OpenAI builtins.* to local canvas node type
function mapNodeType(nodeType: string): string {
  if (!nodeType) return 'note'
  const t = nodeType.startsWith('builtins.')
    ? nodeType.slice('builtins.'.length)
    : nodeType
  switch (t) {
    case 'Start':
      return 'start'
    case 'Agent':
      return 'agent'
    case 'End':
      return 'end'
    case 'Note':
      return 'note'
    case 'IfElse':
      return 'if-else'
    case 'While':
      return 'while'
    case 'SetState':
      return 'set-state'
    case 'BinaryApproval':
      return 'user-approval'
    case 'Transform':
      return 'transform'
    case 'MCP':
      return 'mcp'
    case 'Guardrails':
      return 'guardrails'
    case 'FileSearch':
      return 'file-search'
    default:
      return t.toLowerCase()
  }
}

export function importWorkflowToCanvas(workflow: WorkflowOutput): {
  nodes: Node[]
  edges: Edge[]
} {
  const positions = workflow.ui_metadata?.positionsByNodeId || {}
  const dimensions = workflow.ui_metadata?.dimensionsByNodeId || {}
  const uiData = workflow.ui_metadata?.dataByNodeId || {}
  const uiNodes = workflow.ui_metadata?.uiNodes || []

  const nodes: Node[] = []
  const edges: Edge[] = []

  // Import regular nodes
  workflow.nodes.forEach((n) => {
    const position = positions[n.id] || { x: 0, y: 0 }
    const type = mapNodeType(n.node_type)

    // Clone config and apply UI caseNames back into IfElse labels
    let config: any = n.config ? JSON.parse(JSON.stringify(n.config)) : {}

    // For Start node, rebuild config from workflow-level state_vars and state_variable_json_schema
    if (n.node_type === 'builtins.Start' || type === 'start') {
      const stateVars = workflow.state_vars || []
      const stateSchema = workflow.state_variable_json_schema

      // Rebuild state_vars with type and default from schema
      config.state_vars = stateVars.map((v: any) => {
        const varSchema = stateSchema?.properties?.[v.name]
        if (!varSchema) {
          return {
            id: v.id,
            name: v.name,
            type: 'string',
          }
        }

        const stateVar: any = {
          id: v.id,
          name: v.name,
          type: varSchema.type || 'string',
        }

        // For object type, reconstruct the JSON Schema as default
        if (varSchema.type === 'object' && varSchema.properties) {
          stateVar.default = {
            type: 'object',
            properties: varSchema.properties,
            required: varSchema.required || [],
            additionalProperties: varSchema.additionalProperties ?? false,
          }
        }
        // For other types, use default if exists
        else if (varSchema.default !== undefined) {
          stateVar.default = varSchema.default
        }

        return stateVar
      })
    }

    // For End node, merge workflowOutput from ui_metadata.dataByNodeId
    if (n.node_type === 'builtins.End' || type === 'end') {
      const nodeUiData = uiData[n.id]
      if (nodeUiData?.workflowOutput) {
        config.workflowOutput = nodeUiData.workflowOutput
      }
    }

    if (n.node_type === 'builtins.IfElse' || type === 'if-else') {
      const caseNames: string[] | undefined = uiData?.[n.id]?.caseNames
      if (Array.isArray(config?.cases)) {
        config.cases = config.cases.map((c: any, index: number) => ({
          ...c,
          label:
            Array.isArray(caseNames) && caseNames[index] !== undefined
              ? caseNames[index]
              : '',
        }))
      }
      if (config?.fallback && uiData?.[n.id]?.fallbackName) {
        config.fallback = {
          ...config.fallback,
          label: uiData[n.id].fallbackName,
        }
      }
    } else if (n.node_type === 'builtins.While' || type === 'while') {
      // Handle While node - extract child nodes and edges from body
      if (config.body) {
        // Import child nodes
        config.body.nodes?.forEach((childNode: any) => {
          const childPosition = positions[childNode.id] || { x: 0, y: 0 }
          const childType = mapNodeType(childNode.node_type)

          nodes.push({
            id: childNode.id,
            type: childType,
            position: { x: childPosition.x, y: childPosition.y },
            data: {
              label: childNode.label || childNode.id,
              nodeType: childNode.node_type,
              config: childNode.config || {},
              ...(childNode.input_schema
                ? { inputSchema: childNode.input_schema }
                : {}),
            },
            parentId: n.id, // Set parent relationship
          })
        })

        // Import child edges
        config.body.edges?.forEach((childEdge: any) => {
          edges.push({
            id: childEdge.id,
            source: childEdge.source_node_id,
            target: childEdge.target_node_id,
            sourceHandle: childEdge.source_port_id,
            targetHandle: childEdge.target_port_id,
          })
        })

        // Rule 1: Create dummy-in edge to start_node_id (if it exists)
        const startNodeId = config.body.start_node_id
        if (startNodeId) {
          const startNode = config.body.nodes?.find((node: any) => node.id === startNodeId)
          if (startNode) {
            const targetHandle = getTargetHandle(mapNodeType(startNode.node_type))
            edges.push({
              id: `${n.id}-dummy-in-${startNodeId}`,
              source: n.id,
              target: startNodeId,
              sourceHandle: 'dummy-in',
              targetHandle: targetHandle || 'in',
              type: 'while-inner-connecting',
            })
          }
        }

        // Rule 2: Create edges from unconnected source handles to While.out
        const internalNodeIds = new Set(config.body.nodes?.map((node: any) => node.id) || [])
        config.body.nodes?.forEach((childNode: any) => {
          const childType = mapNodeType(childNode.node_type)
          const sourceHandles = getSourceHandles(childType, childNode.config)

          sourceHandles.forEach((sourceHandle: string) => {
            // Check if this source handle already connects to another internal node
            const connectsToInternalNode = config.body.edges?.some((edge: any) => {
              return (
                edge.source_node_id === childNode.id &&
                edge.source_port_id === sourceHandle &&
                internalNodeIds.has(edge.target_node_id)
              )
            })

            if (!connectsToInternalNode) {
              // Check if edge to While.out already exists
              const outEdgeExists = edges.some(
                (e) =>
                  e.source === childNode.id &&
                  e.sourceHandle === sourceHandle &&
                  e.target === n.id &&
                  e.targetHandle === 'out'
              )

              if (!outEdgeExists) {
                edges.push({
                  id: `${childNode.id}-${sourceHandle}-${n.id}`,
                  source: childNode.id,
                  target: n.id,
                  sourceHandle: sourceHandle,
                  targetHandle: 'out',
                  type: 'while-inner-connecting',
                })
              }
            }
          })
        })
      }
    }

    const dimension = dimensions[n.id]
    const node: Node = {
      id: n.id,
      type,
      position: { x: position.x, y: position.y },
      data: {
        label: n.label || n.id,
        nodeType: n.node_type,
        config,
        ...(n.input_schema ? { inputSchema: n.input_schema } : {}),
      },
      // Set initial dimensions for resizable nodes
      ...(dimension
        ? {
            style: {
              width: dimension.width,
              height: dimension.height,
            },
          }
        : {}),
    }
    nodes.push(node)
  })

  // Import note nodes from uiNodes
  uiNodes.forEach((uiNode: any) => {
    if (uiNode.type === 'note') {
      const position = positions[uiNode.id] || { x: 0, y: 0 }
      const dimension = dimensions[uiNode.id] || { width: 130, height: 60 }

      const noteNode: Node = {
        id: uiNode.id,
        type: 'note',
        position: { x: position.x, y: position.y },
        data: {
          text: uiNode.data?.text || '',
          name: null,
          userDefinedPassthroughVariables: [],
        },
        // Set initial dimensions for resizable node
        style: {
          width: dimension.width,
          height: dimension.height,
        },
        // Set parent relationship if exists
        ...(uiNode.parentId ? { parentId: uiNode.parentId } : {}),
      }
      nodes.push(noteNode)
    }
  })

  // Import top-level edges
  workflow.edges.forEach((e) => {
    edges.push({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: e.source_port_id,
      targetHandle: e.target_port_id,
    })
  })

  return { nodes, edges }
}
