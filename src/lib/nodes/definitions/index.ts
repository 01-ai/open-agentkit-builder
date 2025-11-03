/**
 * Node Definitions
 * Export and register all node definitions
 */

import { nodeRegistry } from '../registry'
import { agentNodeDefinition } from './agent-node'
import { endNodeDefinition } from './end-node'
import { fileSearchNodeDefinition } from './file-search-node'
import { guardrailsNodeDefinition } from './guardrails-node'
import { ifElseNodeDefinition } from './if-else-node'
import { mcpNodeDefinition } from './mcp-node'
import { noteNodeDefinition } from './note-node'
import { setStateNodeDefinition } from './set-state-node'
import { startNodeDefinition } from './start-node'
import { transformNodeDefinition } from './transform-node'
import { userApprovalNodeDefinition } from './user-approval-node'
import { whileNodeDefinition } from './while-node'

// Register all node definitions
nodeRegistry.register(startNodeDefinition)
nodeRegistry.register(agentNodeDefinition)
nodeRegistry.register(endNodeDefinition)
nodeRegistry.register(noteNodeDefinition)
nodeRegistry.register(fileSearchNodeDefinition)
nodeRegistry.register(guardrailsNodeDefinition)
nodeRegistry.register(mcpNodeDefinition)
nodeRegistry.register(ifElseNodeDefinition)
nodeRegistry.register(whileNodeDefinition)
nodeRegistry.register(userApprovalNodeDefinition)
nodeRegistry.register(transformNodeDefinition)
nodeRegistry.register(setStateNodeDefinition)

// Export for direct access if needed
export {
  agentNodeDefinition,
  endNodeDefinition,
  fileSearchNodeDefinition,
  guardrailsNodeDefinition,
  ifElseNodeDefinition,
  mcpNodeDefinition,
  noteNodeDefinition,
  setStateNodeDefinition,
  startNodeDefinition,
  transformNodeDefinition,
  userApprovalNodeDefinition,
  whileNodeDefinition,
}
