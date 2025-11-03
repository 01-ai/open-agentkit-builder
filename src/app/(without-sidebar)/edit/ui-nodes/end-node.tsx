'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface EndNodeProps {
  id: string
  selected?: boolean
}

export function EndNode({ id, selected }: EndNodeProps) {
  return (
    <StandardNode
      nodeType="end"
      label="End"
      selected={selected}
      borderColor={
        selected ? 'border-red-600' : 'border-red-500 hover:border-red-400'
      }
    >
      <StandardHandle id="in" type="target" />
    </StandardNode>
  )
}
