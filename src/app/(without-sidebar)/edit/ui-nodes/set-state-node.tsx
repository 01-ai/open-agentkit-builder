'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface SetStateNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
  }
  selected?: boolean
}

export function SetStateNode({ id, data, selected }: SetStateNodeProps) {
  return (
    <StandardNode nodeType="set-state" label="Set state" selected={selected}>
      <StandardHandle id="in" type="target" />
      <StandardHandle id="out" type="source" />
    </StandardNode>
  )
}
