import { IfElseConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions for If/Else config (matching OpenAI format)
export interface IfElseCase {
  label: string
  output_port_id: string
  predicate: {
    expression: string
    format: 'cel'
  }
}

export interface IfElseFallback {
  label: string
  output_port_id: string
}

export interface IfElseConfig {
  cases: IfElseCase[]
  fallback: IfElseFallback
}

// Configuration component wrapper
const IfElseConfigComponent: React.FC<ConfigComponentProps> = ({
  config,
  onChange,
}) => {
  return <IfElseConfigForm config={config} onChange={onChange} />
}

export const ifElseNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('if-else')!,
  nodeType: 'builtins.IfElse',

  // Ports configuration
  // Note: Output ports are rendered dynamically in the UI component (ui-nodes/if-else-node.tsx)
  // based on the config.cases array
  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [], // Outputs are dynamic, rendered in UI component
  },

  getDefaultConfig: (): IfElseConfig => ({
    cases: [
      {
        label: '',
        output_port_id: 'case-0',
        predicate: {
          expression: '',
          format: 'cel',
        },
      },
    ],
    fallback: {
      label: 'fallback',
      output_port_id: 'fallback',
    },
  }),

  ConfigComponent: IfElseConfigComponent,
}
