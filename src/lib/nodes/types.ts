/**
 * Node Definition System
 * Defines node types, ports, and configuration components
 */

export interface NodeDefinition {
  type: string // 'agent', 'start', 'guardrails'
  nodeType: string // 'builtins.Agent', 'builtins.Start'
  label: string // Display name
  category: 'core' | 'tools' | 'logic' | 'data'
  description: string

  // Port definitions
  ports: {
    inputs: PortDefinition[]
    outputs: PortDefinition[]
  }

  // Get default config (OpenAI format)
  getDefaultConfig: () => any

  // Get input schema (OpenAI format)
  getInputSchema?: () => any

  // Configuration component
  ConfigComponent?: React.ComponentType<ConfigComponentProps>
}

export interface PortDefinition {
  id: string // 'in', 'out', 'pass', 'fail'
  label: string // Display label
  position: 'left' | 'right' | 'top' | 'bottom'
}

export interface ConfigComponentProps {
  nodeId: string
  config: any
  onChange: (newConfig: any) => void
}

// Helper type for node data
export interface NodeData {
  label: string
  nodeType: string
  config?: any
  inputSchema?: any
}
