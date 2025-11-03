// Type definitions for workflow JSON structure
export interface StateVar {
  id: string
  name: string
  default?: any
}

export interface WorkflowNode {
  id: string
  label: string
  node_type: string
  config?: any // Simplified for now
}

export interface Edge {
  source_node_id: string
  target_node_id: string
  source_port_id?: string
  target_port_id?: string
}

export interface Workflow {
  nodes: WorkflowNode[]
  edges: Edge[]
  start_node_id: string
  input_variable_json_schema: {
    properties: { [key: string]: { type: string } }
  }
  state_vars: StateVar[]
  ui_metadata?: {
    dataByNodeId?: {
      [nodeId: string]: {
        workflowOutput?: {
          schema?: any
        }
      }
    }
  }
}
