import { AgentIcon } from '@/components/ui/icons/node-agent-icon'
import { EndIcon } from '@/components/ui/icons/node-end-icon'
import { FileSearchIcon } from '@/components/ui/icons/node-file-search-icon'
import { GuardrailsIcon } from '@/components/ui/icons/node-guardrails-icon'
import { IfElseIcon } from '@/components/ui/icons/node-if-else-icon'
import { McpIcon } from '@/components/ui/icons/node-mcp-icon'
import { NoteIcon } from '@/components/ui/icons/node-note-icon'
import { SetStateIcon } from '@/components/ui/icons/node-set-state-icon'
import { StartIcon } from '@/components/ui/icons/node-start-icon'
import { TransformIcon } from '@/components/ui/icons/node-transform-icon'
import { UserApprovalIcon } from '@/components/ui/icons/node-user-approval-icon'
import { WhileIcon } from '@/components/ui/icons/node-while-icon'

/**
 * Node type definitions
 */
export type NodeType =
  | 'agent'
  | 'start'
  | 'end'
  | 'note'
  | 'file-search'
  | 'guardrails'
  | 'mcp'
  | 'if-else'
  | 'while'
  | 'user-approval'
  | 'transform'
  | 'set-state'

export type NodeCategory = 'core' | 'tools' | 'logic' | 'data'

/**
 * Node configuration interface
 */
export interface NodeConfig {
  type: NodeType
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: NodeCategory
  description: string // Description of the node
  color?: string // Background color for icon
  hidden?: boolean // Whether to hide the node in the palette
}

/**
 * Node configurations
 * Shared across node palette and canvas nodes
 */
export const nodeConfigs: NodeConfig[] = [
  {
    type: 'start',
    label: 'Start',
    category: 'core',
    hidden: true,
    color: 'bg-green-500/10',
    icon: StartIcon,
    description: 'Define the workflow inputs',
  },
  {
    type: 'agent',
    label: 'Agent',
    icon: AgentIcon,
    category: 'core',
    color: 'bg-blue-500/10',
    description: 'Call the model with your instructions and tools',
  },
  {
    type: 'end',
    label: 'End',
    icon: EndIcon,
    category: 'core',
    color: 'bg-green-500/10',
    description: 'Choose the workflow output',
  },
  {
    type: 'note',
    label: 'Note',
    icon: NoteIcon,
    category: 'core',
    color: 'bg-gray-500/20',
    description: 'Document the workflow',
  },
  {
    type: 'file-search',
    label: 'File search',
    icon: FileSearchIcon,
    category: 'tools',
    color: 'bg-yellow-300/50',
    description: 'Query a vector store for relevant information',
  },
  {
    type: 'guardrails',
    label: 'Guardrails',
    icon: GuardrailsIcon,
    category: 'tools',
    color: 'bg-yellow-300/50',
    description: 'Run moderation, PII, jailbreak, or hallucination checks',
  },
  {
    type: 'mcp',
    label: 'MCP',
    icon: McpIcon,
    category: 'tools',
    color: 'bg-yellow-300/50',
    description: 'Invoke a Model Context Protocol tool',
  },
  {
    type: 'if-else',
    label: 'If / else',
    icon: IfElseIcon,
    category: 'logic',
    color: 'bg-orange-200/60',
    description: 'Create conditions to branch your workflow',
  },
  {
    type: 'while',
    label: 'While',
    icon: WhileIcon,
    category: 'logic',
    color: 'bg-orange-200/60',
    description: 'Loop while a condition is true',
  },
  {
    type: 'user-approval',
    label: 'User approval',
    category: 'logic',
    color: 'bg-orange-200/60',
    icon: UserApprovalIcon,
    description: 'Pause for a human to approve or reject a step',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: TransformIcon,
    category: 'data',
    color: 'bg-violet-500/15',
    description: 'Reshape data',
  },
  {
    type: 'set-state',
    label: 'Set state',
    icon: SetStateIcon,
    category: 'data',
    color: 'bg-violet-500/15',
    description: "Assign values to workflow's state variables",
  },
]

/**
 * Get node config by type
 */
export function getNodeConfig(type: NodeType): NodeConfig | undefined {
  return nodeConfigs.find((config) => config.type === type)
}

/**
 * Get node config by type
 */
export function getNodeBasicPropsForDefinition(
  type: NodeType
): Pick<NodeConfig, 'type' | 'label' | 'category' | 'description'> | undefined {
  // only extract nodeConfigs [ type, label, category description ] and return the object
  const config = nodeConfigs.find((config) => config.type === type)
  if (!config) {
    return undefined
  }
  return {
    type: config.type,
    label: config.label,
    category: config.category,
    description: config.description,
  }
}

/**
 * Get nodes by category
 */
export function getNodesByCategory(category: NodeCategory): NodeConfig[] {
  return nodeConfigs.filter((config) => config.category === category)
}

/**
 * Get all categories
 */
export function getCategories(): NodeCategory[] {
  return ['core', 'tools', 'logic', 'data']
}
