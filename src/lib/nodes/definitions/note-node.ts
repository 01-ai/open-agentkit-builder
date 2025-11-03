import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import { NodeDefinition } from '../types'

/**
 * Note Node Definition
 * Note nodes are UI-only elements for annotations, not part of workflow logic
 * They are stored in ui_metadata.uiNodes, not in the main nodes array
 */
export const noteNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('note')!,
  nodeType: 'note',
  ports: {
    inputs: [],
    outputs: [],
  },
  getDefaultConfig: () => ({}),
}
