'use client'

import { UserApprovalConfig } from '@/lib/nodes/definitions/user-approval-node'
import { useMemo } from 'react'
import { useCanvas } from '../canvas/canvas-provider'
import { FormInput } from './components/form-input'
import { FormTextarea } from './components/form-textarea'

interface UserApprovalConfigProps {
  nodeId: string
  config: UserApprovalConfig
  onChange: (config: UserApprovalConfig) => void
}

export function UserApprovalConfigForm({
  nodeId,
  config,
  onChange,
}: UserApprovalConfigProps) {
  const { getNode, updateNodeLabel } = useCanvas()

  // Get node label
  const nodeLabel = useMemo(() => {
    return getNode(nodeId)?.data?.label || ''
  }, [getNode, nodeId])

  // Handle name (label) change
  const handleNameChange = (value: string) => {
    updateNodeLabel?.(nodeId, value)
  }

  // Handle message change
  const handleMessageChange = (value: string) => {
    onChange({
      ...config,
      message: value,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Name field - updates node label */}
      <FormInput
        label="Name"
        value={nodeLabel as string}
        onValueChange={handleNameChange}
        placeholder="User approval"
      />

      {/* Message field */}
      <FormTextarea
        label="Message"
        value={config.message}
        onValueChange={handleMessageChange}
        placeholder="Describe the message to show the user. E.g. ok to process?"
        rows={3}
      />
    </div>
  )
}
