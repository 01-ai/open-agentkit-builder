'use client'

import { UserApprovalConfig } from '@/lib/nodes/definitions/user-approval-node'
import { StandardNode } from './base'
import { BranchInput } from './base/branch-input'
import { StandardHandle } from './base/standard-handle'

interface UserApprovalNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
    config?: UserApprovalConfig
  }
  selected?: boolean
}

export function UserApprovalNode({ data, selected }: UserApprovalNodeProps) {
  const config = data.config

  // Fixed output ports for user approval node
  const outputPorts = [
    { id: 'on_approve', label: 'Approve' },
    { id: 'on_reject', label: 'Reject' },
  ]

  // subtitle comes from config.message
  const subtitle = config?.message || undefined

  return (
    <StandardNode
      nodeType="user-approval"
      label={data.label || 'User approval'}
      subtitle={subtitle}
      selected={selected}
      borderColor={
        selected
          ? 'border-amber-600'
          : 'border-amber-500 hover:border-amber-400'
      }
    >
      {/* target handle on the left, vertically centered */}
      <StandardHandle id="in" type="target" />

      {/* Branch rows with labels and right-aligned grouped source handles */}
      <div className="mt-[7px] flex flex-col gap-0.5">
        {outputPorts.map((port, index) => (
          <BranchInput
            key={port.id}
            index={index}
            totalCount={outputPorts.length}
            label={port.label}
            portId={port.id}
          />
        ))}
      </div>
    </StandardNode>
  )
}
