'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface StartNodeProps {
  id: string
  data: {
    label: string
  }
  selected?: boolean
}

export function StartNode({ id, data, selected }: StartNodeProps) {
  return (
    <StandardNode
      nodeType="start"
      label={data.label}
      selected={selected}
      borderColor={
        selected
          ? 'border-green-600'
          : 'border-green-500 hover:border-green-400'
      }
    >
      <StandardHandle id="out" type="source" selected={selected} />
    </StandardNode>
  )
}
