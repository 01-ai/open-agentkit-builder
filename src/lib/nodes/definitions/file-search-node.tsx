'use client'

import { FileSearchConfig } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import { NodeDefinition } from '../types'

export const fileSearchNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('file-search')!,
  nodeType: 'builtins.FileSearch',

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

  getDefaultConfig: () => ({
    vector_store_id: '',
    max_results: 10,
    query: {
      expression: '',
      format: 'cel',
    },
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

  ConfigComponent: FileSearchConfig,
}
