'use client'

import { StandardNode } from './base'
import { StandardHandle } from './base/standard-handle'

interface McpNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
  }
  selected?: boolean
}

export function McpNode({ id, data, selected }: McpNodeProps) {
  return (
    <StandardNode nodeType="mcp" label="MCP" selected={selected}>
      <StandardHandle id="in" type="target" />
      <StandardHandle id="out" type="source" />
    </StandardNode>
  )
}
