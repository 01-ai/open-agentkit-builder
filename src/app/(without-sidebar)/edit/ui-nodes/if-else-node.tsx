'use client'

import { IfElseConfig } from '@/lib/nodes/definitions/if-else-node'
import { StandardNode } from './base'
import { BranchInput } from './base/branch-input'
import { StandardHandle } from './base/standard-handle'

interface IfElseNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
    config?: IfElseConfig
  }
  selected?: boolean
}

export function IfElseNode({ id, data, selected }: IfElseNodeProps) {
  const config = data.config
  const outputPorts: Array<{ id: string; label: string }> = []

  if (config) {
    config.cases?.forEach((caseItem) => {
      // OpenAI display priority:
      // 1. If user provided a custom case name (label is not empty)
      // 2. Else if condition expression is provided
      // 3. Else show empty string
      const hasLabel = caseItem.label && caseItem.label.trim() !== ''
      const hasExpression =
        caseItem.predicate?.expression &&
        caseItem.predicate.expression.trim() !== ''

      let displayLabel: string
      if (hasLabel) {
        // User provided custom name
        displayLabel = caseItem.label
      } else if (hasExpression) {
        // Show expression if no custom name
        displayLabel = caseItem.predicate.expression
      } else {
        // Show empty string
        displayLabel = ''
      }

      outputPorts.push({
        id: caseItem.output_port_id,
        label: displayLabel,
      })
    })

    // Fallback always shows "Else"
    if (config.fallback) {
      outputPorts.push({
        id: config.fallback.output_port_id,
        label: 'Else',
      })
    }
  }

  return (
    <StandardNode
      nodeType="if-else"
      label={data.label || 'If / else'}
      selected={selected}
    >
      {/* target handle on the left, vertically centered when only 1 port */}
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
