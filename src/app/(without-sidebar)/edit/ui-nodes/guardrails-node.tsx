'use client'

import { GuardrailsNodeConfig } from '@/lib/nodes/definitions/guardrails-node'
import { StandardNode } from './base'
import { BranchInput } from './base/branch-input'
import { StandardHandle } from './base/standard-handle'

interface GuardrailsNodeProps {
  id: string
  data: {
    label?: string
    subtitle?: string
    config?: GuardrailsNodeConfig
  }
  selected?: boolean
}

export function GuardrailsNode({ id, data, selected }: GuardrailsNodeProps) {
  const config = data.config
  const outputPorts: Array<{ id: string; label: string }> = [
    {
      id: 'on_pass',
      label: 'Pass',
    },
  ]

  if (config) {
    // Add Fail output (always present when guardrails are configured)
    if (config.guardrails && config.guardrails.length > 0) {
      outputPorts.push({
        id: 'on_fail',
        label: 'Fail',
      })
    }

    // Add Error output (only when continue_on_error is true)
    if (config.continue_on_error) {
      outputPorts.push({
        id: 'on_error',
        label: 'Error',
      })
    }
  }

  return (
    <StandardNode
      nodeType="guardrails"
      label={data.label || 'Guardrails'}
      selected={selected}
      borderColor={
        selected
          ? 'border-orange-600'
          : 'border-orange-500 hover:border-orange-400'
      }
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
