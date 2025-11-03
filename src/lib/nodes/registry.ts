import { NodeDefinition } from './types'

/**
 * Node Registry
 * Central registry for all node definitions
 */
class NodeRegistry {
  private definitions = new Map<string, NodeDefinition>()

  register(definition: NodeDefinition) {
    // Register by both 'type' (for node palette) and 'nodeType' (for config lookup)
    this.definitions.set(definition.type, definition)
    this.definitions.set(definition.nodeType, definition)
  }

  get(typeOrNodeType: string): NodeDefinition | undefined {
    return this.definitions.get(typeOrNodeType)
  }

  getAll(): NodeDefinition[] {
    // Return unique definitions (since each is registered twice)
    const uniqueDefinitions = new Map<string, NodeDefinition>()
    this.definitions.forEach((def) => {
      uniqueDefinitions.set(def.type, def)
    })
    return Array.from(uniqueDefinitions.values())
  }

  getByCategory(category: string): NodeDefinition[] {
    return this.getAll().filter((def) => def.category === category)
  }
}

export const nodeRegistry = new NodeRegistry()
