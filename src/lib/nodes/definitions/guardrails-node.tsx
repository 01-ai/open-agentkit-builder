'use client'

import { GuardrailsConfig } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import { NodeDefinition } from '../types'

interface Expr {
  expression: string
  format: 'cel'
}

export interface GuardrailsNodeConfig {
  continue_on_error: boolean
  guardrails: unknown[]
  expr: Expr
}

export const guardrailsNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('guardrails')!,
  nodeType: 'builtins.Guardrails',

  // Ports configuration
  // Note: Output ports are rendered dynamically in the UI component (ui-nodes/guardrails-node.tsx)
  // based on the config.guardrails and config.continue_on_error
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

  getDefaultConfig: (): GuardrailsNodeConfig => ({
    continue_on_error: false,
    expr: {
      expression: 'workflow.input_as_text',
      format: 'cel',
    },
    guardrails: [],
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

  ConfigComponent: GuardrailsConfig,
}
