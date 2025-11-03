'use client'

import { WhileConfig } from '@/lib/nodes/definitions/while-node'
import { FormTextarea } from './components/form-textarea'

interface WhileConfigFormProps {
  config: WhileConfig
  onChange: (newConfig: WhileConfig) => void
}

export function WhileConfigForm({ config, onChange }: WhileConfigFormProps) {
  const handleExpressionChange = (expression: string) => {
    onChange({
      ...config,
      condition: {
        ...config.condition,
        expression,
      },
    })
  }

  return (
    <div className="space-y-4">
      <FormTextarea
        label="Expression"
        value={config.condition?.expression || ''}
        onValueChange={handleExpressionChange}
        placeholder="input.foo == 5"
        serialized={true}
      />
      <p className="text-xs text-muted-foreground/80">
        Use Common Expression Language to create a custom expression. Learn
        more.
        <a href="#" className="ml-1 underline hover:text-muted-foreground">
          Learn more.
        </a>
      </p>
    </div>
  )
}
