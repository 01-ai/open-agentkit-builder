import { WhileConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

/**
 * While Node Config Structure (OpenAI Format)
 */
export interface WhileCondition {
  expression: string
  format: 'cel'
}

export interface WhileBody {
  edges: any[]
  nodes: any[]
  start_node_id: string
}

export interface WhileConfig {
  condition: WhileCondition
  body: WhileBody
}

// Configuration component wrapper
const WhileConfigComponent: React.FC<ConfigComponentProps> = ({
  config,
  onChange,
}) => {
  return <WhileConfigForm config={config} onChange={onChange} />
}

export const whileNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('while')!,
  nodeType: 'builtins.While',

  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [
      {
        id: 'out',
        label: 'Output',
        position: 'right',
      },
    ],
  },

  getDefaultConfig: (): WhileConfig => ({
    condition: {
      expression: '',
      format: 'cel',
    },
    body: {
      edges: [],
      nodes: [],
      start_node_id: '',
    },
  }),

  ConfigComponent: WhileConfigComponent,
}
