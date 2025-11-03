'use client'

import { TransformConfig } from '@/lib/nodes/definitions/transform-node'
import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface TransformNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
    config?: TransformConfig
  }
  selected?: boolean
}

export function TransformNode({ data, selected }: TransformNodeProps) {
  // Use the node label, fall back to default
  const displayLabel = data.label || 'Transform'

  return (
    <StandardNode nodeType="transform" label={displayLabel} selected={selected}>
      <StandardHandle id="in" type="target" />
      <StandardHandle id="out" type="source" />
    </StandardNode>
  )
}
