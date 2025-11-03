'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface AgentNodeProps {
  id: string
  data: {
    label: string
    subtitle?: string
  }
  selected?: boolean
}

export function AgentNode({ id, data, selected }: AgentNodeProps) {
  return (
    <StandardNode
      nodeType="agent"
      defaultLabel="Agent"
      label={data.label}
      subtitle={data.subtitle}
      selected={selected}
    >
      <StandardHandle id="in" type="target" />
      <StandardHandle id="on_result" type="source" />
    </StandardNode>
  )
}
