import { UserApprovalConfigForm } from '@/app/(without-sidebar)/edit/form-nodes'
import { getNodeBasicPropsForDefinition } from '@/lib/node-configs'
import React from 'react'
import { ConfigComponentProps, NodeDefinition } from '../types'

// Type definitions for User Approval config (matching OpenAI format)
export interface UserApprovalConfig {
  message: string
  variable_mapping: Array<{
    variable_name: string
    source_path: string
  }>
}

// Configuration component wrapper
const UserApprovalConfigComponent: React.FC<ConfigComponentProps> = ({
  nodeId,
  config,
  onChange,
}) => {
  return (
    <UserApprovalConfigForm
      nodeId={nodeId}
      config={config}
      onChange={onChange}
    />
  )
}

export const userApprovalNodeDefinition: NodeDefinition = {
  ...getNodeBasicPropsForDefinition('user-approval')!,
  nodeType: 'builtins.BinaryApproval',

  // Static ports: one input, two fixed outputs
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
        id: 'on_approve',
        label: 'Approve',
        position: 'right',
      },
      {
        id: 'on_reject',
        label: 'Reject',
        position: 'right',
      },
    ],
  },

  getDefaultConfig: (): UserApprovalConfig => ({
    message: '',
    variable_mapping: [],
  }),

  ConfigComponent: UserApprovalConfigComponent,
}
