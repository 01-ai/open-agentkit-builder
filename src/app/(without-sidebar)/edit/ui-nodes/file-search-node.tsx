'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface FileSearchNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
  }
  selected?: boolean
}

export function FileSearchNode({ id, data, selected }: FileSearchNodeProps) {
  return (
    <StandardNode
      nodeType="file-search"
      label="File search"
      selected={selected}
    >
      <StandardHandle id="in" type="target" />
      <StandardHandle id="on_result" type="source" />
    </StandardNode>
  )
}
