/**
 * Export Workflow to OpenAI Format
 * Converts React Flow nodes/edges to OpenAI AgentBuilder JSON format
 */

import type { IfElseConfig } from '@/lib/nodes/definitions/if-else-node'
import type {
  StartConfig,
  StateVariable,
} from '@/lib/nodes/definitions/start-node'
import { Edge, Node } from '@xyflow/react'
import { useAuthStore } from '../store/auth-store'

export interface WorkflowOutput {
  id: string
  object: 'workflow'
  created_at: number
  creator_user_id: string
  default_version: null
  edges: OpenAIEdge[]
  highest_version: null
  input_variable_json_schema: JSONSchema
  is_default: boolean
  is_moderation_flagged: boolean
  label: string
  moderation_flagged_categories: null
  moderation_violations: null
  name: string
  nodes: OpenAINode[]
  start_node_id: string
  state_variable_json_schema: JSONSchema
  state_vars: any[]
  ui_metadata: UIMetadata
  updated_at: number
  version: 'draft'
  version_stage: 'draft'
  workflow_type: 'chat'
}

export interface OpenAINode {
  id: string
  label: string
  node_type: string
  config?: any
  input_schema?: any
}

export interface OpenAIEdge {
  id: string
  source_node_id: string
  source_port_id: string
  target_node_id: string
  target_port_id: string
}

export interface JSONSchema {
  type: string
  properties: Record<string, any>
  required: string[]
  additionalProperties: boolean
}

export interface UIMetadata {
  positionsByNodeId: Record<string, { x: number; y: number }>
  uiNodes: any[]
  dataByNodeId: Record<string, any>
  dimensionsByNodeId: Record<string, any>
  draft: Record<string, any>
}

/**
 * Generate a random workflow ID
 */
export function generateWorkflowId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'wf_'
  for (let i = 0; i < 48; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Export workflow to OpenAI format
 */
export function exportWorkflow(
  nodes: Node[] = [],
  edges: Edge[] = [],
  workflowName: string = 'workflow',
  existingId?: string
): WorkflowOutput {
  const now = Math.floor(Date.now() / 1000)

  // Prepare UI data bucket
  const uiDataByNodeId: Record<string, any> = {}
  const uiNodes: any[] = []

  // Convert nodes (defensive)
  const validNodes = Array.isArray(nodes)
    ? nodes.filter((n) => n && (n as any).id && (n as any).type)
    : []

  // Separate note nodes and regular nodes, also track parent relationships
  const regularNodes = validNodes.filter((n) => (n as any).type !== 'note')
  const noteNodes = validNodes.filter((n) => (n as any).type === 'note')

  // Track nodes by parent - for While node nesting
  const nodesByParent = new Map<string, any[]>()
  const topLevelNodes: any[] = []

  regularNodes.forEach((node: any) => {
    const parentId = node.parentId || node.parentNode
    if (parentId) {
      if (!nodesByParent.has(parentId)) {
        nodesByParent.set(parentId, [])
      }
      nodesByParent.get(parentId)!.push(node)
    } else {
      topLevelNodes.push(node)
    }
  })

  // Track edges by parent - for While node nesting
  const edgesByParent = new Map<string, any[]>()
  const topLevelEdges: any[] = []

  ;(Array.isArray(edges) ? edges : []).forEach((edge: any) => {
    // Find the parent of source and target nodes
    const sourceNode = validNodes.find((n: any) => n.id === edge.source)
    const targetNode = validNodes.find((n: any) => n.id === edge.target)
    const sourceParent = sourceNode?.parentId || sourceNode?.parentNode
    const targetParent = targetNode?.parentId || targetNode?.parentNode

    // Edge belongs to parent if both nodes have same parent
    if (sourceParent && sourceParent === targetParent) {
      if (!edgesByParent.has(sourceParent)) {
        edgesByParent.set(sourceParent, [])
      }
      edgesByParent.get(sourceParent)!.push(edge)
    } else if (!sourceParent && !targetParent) {
      topLevelEdges.push(edge)
    }
  })

  const openAINodes: OpenAINode[] = topLevelNodes.map((node) => {
    const data: any = (node as any).data || {}
    const nodeType = data.nodeType || `builtins.${(node as any).type}`

    const openAINode: OpenAINode = {
      id: (node as any).id,
      label: data.label || (node as any).id,
      node_type: nodeType,
    }

    // Add config if exists
    if (data.config && Object.keys(data.config).length > 0) {
      // Special handling for If/Else to match OpenAI export format
      if (nodeType === 'builtins.IfElse' || (node as any).type === 'if-else') {
        const config = data.config as IfElseConfig
        const cases = Array.isArray(config?.cases) ? config.cases : []

        // Collect UI case names from current labels
        const caseNames = cases.map((c) => c.label ?? '')

        if (caseNames.length > 0) {
          uiDataByNodeId[(node as any).id] = {
            ...(uiDataByNodeId[(node as any).id] || {}),
            caseNames,
          }
        }

        // Normalize labels to stable case-i while preserving ids and predicates
        const normalizedCases = cases.map((c, index) => ({
          ...c,
          label: `case-${index}`,
        }))

        openAINode.config = {
          ...config,
          cases: normalizedCases,
        }
      } else if (
        nodeType === 'builtins.While' ||
        (node as any).type === 'while'
      ) {
        // Special handling for While node - embed child nodes and edges
        const config = data.config || {}
        const childNodes = nodesByParent.get((node as any).id) || []
        const childEdges = edgesByParent.get((node as any).id) || []

        // Convert child nodes to OpenAI format (recursively)
        const bodyNodes = childNodes.map((childNode: any) => {
          const childData = childNode.data || {}
          const childNodeType =
            childData.nodeType || `builtins.${childNode.type}`
          return {
            id: childNode.id,
            label: childData.label || childNode.id,
            node_type: childNodeType,
            config: childData.config || {},
            ...(childData.inputSchema
              ? { input_schema: childData.inputSchema }
              : {}),
          }
        })

        // Convert child edges to OpenAI format
        const bodyEdges = childEdges.map((edge: any) => ({
          id: edge.id,
          source_node_id: edge.source,
          source_port_id: edge.sourceHandle || 'out',
          target_node_id: edge.target,
          target_port_id: edge.targetHandle || 'in',
        }))

        // Get start_node_id from config if it exists
        const configStartNodeId = config.body?.start_node_id
        const startNodeId =
          configStartNodeId !== undefined ? configStartNodeId : ''

        openAINode.config = {
          condition: config.condition || {
            expression: '',
            format: 'cel',
          },
          body: {
            nodes: bodyNodes,
            edges: bodyEdges,
            start_node_id: startNodeId,
          },
        }
      } else if (nodeType === 'builtins.End' || (node as any).type === 'end') {
        // Special handling for End node - extract workflowOutput to uiData
        const config = data.config || {}

        // Save workflowOutput to uiDataByNodeId
        if (config.workflowOutput) {
          uiDataByNodeId[(node as any).id] = {
            ...(uiDataByNodeId[(node as any).id] || {}),
            workflowOutput: config.workflowOutput,
          }
        } else {
          // Set to null if no workflowOutput
          uiDataByNodeId[(node as any).id] = {
            ...(uiDataByNodeId[(node as any).id] || {}),
            workflowOutput: null,
          }
        }

        // Only keep expr in the config (exclude workflowOutput)
        const { workflowOutput, ...restConfig } = config
        openAINode.config = restConfig
      } else {
        openAINode.config = data.config
      }
    }

    // Add input_schema if exists
    if (data.inputSchema) {
      openAINode.input_schema = data.inputSchema
    }

    return openAINode
  })

  // Handle note nodes - add to uiNodes array
  noteNodes.forEach((node) => {
    const data: any = (node as any).data || {}
    const parentId = (node as any).parentId || (node as any).parentNode

    const uiNode: any = {
      id: (node as any).id,
      type: 'note',
      data: {
        name: null,
        userDefinedPassthroughVariables: [],
        text: data.text || '',
      },
    }

    // Add parentId if this note is inside a While node
    if (parentId) {
      uiNode.parentId = parentId
    }

    uiNodes.push(uiNode)
  })

  // Convert top-level edges only
  const nodeIdSet = new Set(topLevelNodes.map((n: any) => n.id))
  const openAIEdges: OpenAIEdge[] = topLevelEdges
    .filter(
      (edge) => edge && nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
    )
    .map((edge) => ({
      id: edge.id,
      source_node_id: edge.source,
      source_port_id: edge.sourceHandle || 'out',
      target_node_id: edge.target,
      target_port_id: edge.targetHandle || 'in',
    }))

  // Build UI metadata
  const positionsByNodeId: Record<string, { x: number; y: number }> = {}
  const dimensionsByNodeId: Record<string, { width: number; height: number }> =
    {}

  validNodes.forEach((node: any) => {
    positionsByNodeId[node.id] = {
      x: node?.position?.x ?? 0,
      y: node?.position?.y ?? 0,
    }

    // Store dimensions for resizable nodes (note and while)
    if (
      (node.type === 'note' || node.type === 'while') &&
      (node.measured?.width || node.measured?.height)
    ) {
      dimensionsByNodeId[node.id] = {
        width: node.measured.width ?? (node.type === 'while' ? 200 : 130),
        height: node.measured.height ?? (node.type === 'while' ? 150 : 60),
      }
    }
  })

  const uiMetadata: UIMetadata = {
    positionsByNodeId,
    uiNodes,
    dataByNodeId: uiDataByNodeId,
    dimensionsByNodeId,
    draft: {},
  }

  // Find start node
  const startNode = validNodes.find(
    (n) =>
      (n as any).type === 'start' ||
      (n as any).data?.nodeType === 'builtins.Start' ||
      (n as any).id === 'start'
  )

  // Extract state variables from start node config
  const startConfig = (startNode as any)?.data?.config as
    | StartConfig
    | undefined
  const stateVars = startConfig?.state_vars || []

  // Generate state_variable_json_schema from state variables
  const stateVariableJsonSchema = generateStateVariableJsonSchema(stateVars)

  // Format state_vars for export (only id and name, matching OpenAI format)
  const formattedStateVars = stateVars.map((v) => ({
    id: v.id,
    name: v.name,
  }))

  return {
    id: existingId || generateWorkflowId(),
    object: 'workflow',
    created_at: now,
    creator_user_id: useAuthStore.getState().user?.id?.toString() ?? '',
    default_version: null,
    edges: openAIEdges,
    highest_version: null,
    input_variable_json_schema: {
      type: 'object',
      properties: {
        input_as_text: {
          type: 'string',
        },
      },
      required: ['input_as_text'],
      additionalProperties: false,
    },
    is_default: false,
    is_moderation_flagged: false,
    label: 'New workflow',
    moderation_flagged_categories: null,
    moderation_violations: null,
    name: workflowName,
    nodes: openAINodes,
    start_node_id: startNode?.id || '',
    state_variable_json_schema: stateVariableJsonSchema,
    state_vars: formattedStateVars,
    ui_metadata: uiMetadata,
    updated_at: now,
    version: 'draft',
    version_stage: 'draft',
    workflow_type: 'chat',
  }
}

/**
 * Generate JSON Schema from state variables
 */
function generateStateVariableJsonSchema(
  stateVars: StateVariable[]
): JSONSchema {
  const properties: Record<string, any> = {}
  const required: string[] = []

  stateVars.forEach((variable) => {
    // Map our type to JSON Schema type
    let jsonType: string
    switch (variable.type) {
      case 'string':
        jsonType = 'string'
        break
      case 'number':
        jsonType = 'number'
        break
      case 'boolean':
        jsonType = 'boolean'
        break
      case 'array':
        jsonType = 'array'
        break
      case 'object':
        jsonType = 'object'
        break
      default:
        jsonType = 'string'
    }

    const propertySchema: any = {
      type: jsonType,
    }

    // Add default value if exists
    if (variable.default !== undefined && variable.default !== '') {
      propertySchema.default = variable.default
    }

    // For object type, check if default is a JSON Schema
    if (variable.type === 'object' && typeof variable.default === 'object') {
      const defaultObj = variable.default as Record<string, any>

      // Check if default is a JSON Schema (has type and properties fields)
      if (
        defaultObj &&
        typeof defaultObj === 'object' &&
        'properties' in defaultObj
      ) {
        // Use the JSON Schema directly
        propertySchema.properties = defaultObj.properties || {}
        propertySchema.required = defaultObj.required || []
        propertySchema.additionalProperties =
          defaultObj.additionalProperties ?? false

        // Don't include default in the schema
        delete propertySchema.default
      } else {
        // If default is not a JSON Schema, treat it as a regular object
        // Generate properties from object keys
        const objProperties: Record<string, any> = {}
        const objRequired: string[] = []

        Object.keys(defaultObj).forEach((key) => {
          const value = defaultObj[key]
          const valueType = typeof value
          objProperties[key] = {
            type:
              valueType === 'number'
                ? 'number'
                : valueType === 'boolean'
                  ? 'boolean'
                  : 'string',
          }
          objRequired.push(key)
        })

        propertySchema.properties = objProperties
        propertySchema.required = objRequired
        propertySchema.additionalProperties = false
        delete propertySchema.default
      }
    }

    // For array type, add items schema if we have default
    if (
      variable.type === 'array' &&
      Array.isArray(variable.default) &&
      variable.default.length > 0
    ) {
      const firstItem = variable.default[0]
      const itemType = typeof firstItem
      propertySchema.items = {
        type:
          itemType === 'number'
            ? 'number'
            : itemType === 'boolean'
              ? 'boolean'
              : 'string',
      }
    }

    properties[variable.name] = propertySchema
    required.push(variable.name)
  })

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }
}
