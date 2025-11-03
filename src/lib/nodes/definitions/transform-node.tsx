import { TransformConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions for Transform config (matching OpenAI format)
export interface TransformExpression {
  id: string
  key: string
  expression: string
}

export interface TransformObjectSchema {
  name: string
  strict: boolean
  schema: any
}

export interface TransformConfig {
  expr: {
    expression: string
    format: 'cel'
  }
  expressions?: TransformExpression[] // openAI workflow json中这些数据放在dataByNodeId中
  objectSchema?: TransformObjectSchema
  outputKind?: 'expressions' | 'object'
}

// Configuration component wrapper
const TransformConfigComponent: React.FC<ConfigComponentProps> = ({
  nodeId,
  config,
  onChange,
}) => {
  return (
    <TransformConfigForm nodeId={nodeId} config={config} onChange={onChange} />
  )
}

export const transformNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('transform')!,
  nodeType: 'builtins.Transform',

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

  getDefaultConfig: (): TransformConfig => ({
    expr: {
      expression: '',
      format: 'cel',
    },
    expressions: [
      {
        id: `expression_${Date.now()}`,
        key: 'result',
        expression: '',
      },
    ],
    outputKind: 'expressions',
    objectSchema: {
      name: 'ObjectSchema',
      strict: true,
      schema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
      },
    },
  }),

  ConfigComponent: TransformConfigComponent,
}
