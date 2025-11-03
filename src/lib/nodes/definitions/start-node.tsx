import { StartConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions for Start node config (matching OpenAI format)
export type StateVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'

export interface StateVariable {
  id: string
  name: string
  type: StateVariableType
  default?: string | number | boolean | object | any[]
}

export interface StartConfig {
  state_vars: StateVariable[]
}

// Configuration component wrapper
const StartConfigComponent: React.FC<ConfigComponentProps> = ({
  config,
  onChange,
}) => {
  return <StartConfigForm config={config} onChange={onChange} />
}

/**
 * Start Node Definition
 */
export const startNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('start')!,
  nodeType: 'builtins.Start',

  ports: {
    inputs: [],
    outputs: [{ id: 'out', label: 'Output', position: 'right' }],
  },

  getDefaultConfig: (): StartConfig => ({
    state_vars: [],
  }),

  ConfigComponent: StartConfigComponent,
}
