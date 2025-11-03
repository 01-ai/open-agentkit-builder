import { SetStateConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions for Set State config (matching OpenAI format)
export interface SetStateAssignment {
  expression: {
    expression: string
    format: 'cel'
  }
  name: string // Variable name to assign to
}

export interface SetStateConfig {
  assignments: SetStateAssignment[]
}

// Configuration component wrapper
const SetStateConfigComponent: React.FC<ConfigComponentProps> = ({
  nodeId,
  config,
  onChange,
}) => {
  return (
    <SetStateConfigForm nodeId={nodeId} config={config} onChange={onChange} />
  )
}

export const setStateNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('set-state')!,
  nodeType: 'builtins.SetState',

  // Ports configuration
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

  getDefaultConfig: (): SetStateConfig => ({
    assignments: [],
  }),

  getInputSchema: () => ({
    name: 'input',
    strict: true,
    schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      required: [],
    },
    additionalProperties: false,
  }),

  ConfigComponent: SetStateConfigComponent,
}
