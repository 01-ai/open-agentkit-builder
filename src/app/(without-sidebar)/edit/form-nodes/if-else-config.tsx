'use client'

import { IfElseCase, IfElseConfig } from '@/lib/nodes/definitions/if-else-node'
import { Plus } from 'lucide-react'
import { FormButton } from './components/form-button'
import { FormInput } from './components/form-input'
import { FormRemoveButton } from './components/form-remove-button'
import { FormTextarea } from './components/form-textarea'

interface IfElseConfigProps {
  config: IfElseConfig
  onChange: (config: IfElseConfig) => void
}

export function IfElseConfigForm({ config, onChange }: IfElseConfigProps) {
  // Add a new case
  const handleAddCase = () => {
    const newCaseId = `case-${config.cases.length}`
    const newCase: IfElseCase = {
      label: '',
      output_port_id: newCaseId,
      predicate: {
        expression: '',
        format: 'cel',
      },
    }

    onChange({
      ...config,
      cases: [...config.cases, newCase],
    })
  }

  // Remove a case
  const handleRemoveCase = (index: number) => {
    const newCases = config.cases.filter((_, i) => i !== index)
    onChange({
      ...config,
      cases: newCases,
    })
  }

  // Update case label
  const handleCaseLabelChange = (index: number, label: string) => {
    const newCases = [...config.cases]
    newCases[index] = {
      ...newCases[index],
      label,
    }
    onChange({
      ...config,
      cases: newCases,
    })
  }

  // Update case expression
  const handleCaseExpressionChange = (index: number, expression: string) => {
    const newCases = [...config.cases]
    newCases[index] = {
      ...newCases[index],
      predicate: {
        ...newCases[index].predicate,
        expression,
      },
    }
    onChange({
      ...config,
      cases: newCases,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {config.cases?.map((caseItem, index) => (
        <div key={caseItem.output_port_id} className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <div>{index === 0 ? 'If' : 'Else if'}</div>
            {config.cases.length > 1 && (
              <FormRemoveButton onClick={() => handleRemoveCase(index)} />
            )}
          </div>

          <div className="space-y-2">
            <FormInput
              value={caseItem.label}
              onValueChange={(value: string) =>
                handleCaseLabelChange(index, value)
              }
              placeholder="Case name (optional)"
            />
          </div>

          <div className="space-y-2">
            <FormTextarea
              value={caseItem.predicate.expression}
              onValueChange={(value: string) =>
                handleCaseExpressionChange(index, value)
              }
              placeholder="Enter condition,e.g.input == 5"
            />
            {index === 0 && (
              <p className="text-xs text-muted-foreground">
                Use Common Expression Language to create a custom expression.
                Learn more.
              </p>
            )}
          </div>
        </div>
      ))}

      <div>
        <FormButton onClick={handleAddCase}>
          <Plus className="size-3.5" />
          Add
        </FormButton>
      </div>
    </div>
  )
}
