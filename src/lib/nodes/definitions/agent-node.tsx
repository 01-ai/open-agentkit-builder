'use client'

import { AgentConfig } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import { NodeDefinition } from '../types'

/**
 * Agent Node Definition
 */
export const agentNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('agent')!,
  nodeType: 'builtins.Agent',
  ports: {
    inputs: [{ id: 'in', label: 'Input', position: 'left' }],
    outputs: [{ id: 'on_result', label: 'Result', position: 'right' }],
  },

  getDefaultConfig: () => ({
    hidden_properties: null,
    instructions: {
      expression: '',
      format: 'cel',
    },
    messages: [],
    model: {
      expression: 'gpt-4',
      format: 'cel',
    },
    reads_from_history: true,
    reasoning: {
      effort: 'low',
      summary: null,
    },
    text: {
      format: {
        name: '',
        schema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
          required: [],
          title: 'response_schema',
        },
        type: 'text',
        strict: true,
      },
      verbosity: 'medium',
    },
    tools: [],
    user_visible: true,
    variable_mapping: [],
    writes_to_history: true,
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

  ConfigComponent: AgentConfig,
}
