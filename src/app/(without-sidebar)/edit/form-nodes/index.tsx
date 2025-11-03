/**
 * Form Nodes - Configuration forms for nodes
 * These components handle the configuration UI for each node type
 */

export { AgentConfig } from './agent-config'
export { FileSearchConfig } from './file-search-config'
export { GuardrailsConfig } from './guardrails-config'
export { IfElseConfigForm } from './if-else-config'
export { SetStateConfigForm } from './set-state-config'
export { TransformConfigForm } from './transform-config'
export { UserApprovalConfigForm } from './user-approval-config'
export { WhileConfigForm } from './while-config'

export { EndConfigForm } from './end-config'
export { StartConfigForm } from './start-config'

// Export a common config props type
export interface BaseConfigProps {
  nodeId: string
  config: any
  onChange: (newConfig: any) => void
}
