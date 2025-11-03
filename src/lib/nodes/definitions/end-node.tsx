import { EndConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import { NodeDefinition } from '../types'

// Type definitions for End node config (matching OpenAI format)
export interface WorkflowOutput {
  name: string
  strict: boolean
  schema: {
    type: string
    properties: Record<string, unknown>
    additionalProperties: boolean
    required: string[]
    title?: string
  }
}

export interface EndNodeConfig {
  expr?: {
    expression: string
    format: string
  }
  workflowOutput?: WorkflowOutput
}

export const endNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('end')!,
  nodeType: 'builtins.End',

  ports: {
    inputs: [
      {
        id: 'in',
        label: 'Input',
        position: 'left',
      },
    ],
    outputs: [],
  },

  getDefaultConfig: (): EndNodeConfig => ({
    expr: {
      expression: '{}',
      format: 'cel',
    },
    workflowOutput: {
      name: 'WorkflowOutput',
      strict: true,
      schema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
        required: [],
      },
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

  ConfigComponent: EndConfigForm,
}
