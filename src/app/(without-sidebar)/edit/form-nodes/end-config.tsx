'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ConfigComponentProps } from '@/lib/nodes/types'
import { Braces, Plus } from 'lucide-react'
import { useState } from 'react'
import { DialogSchemaJSON } from './components/dialog-schema-json'

/**
 * End Node Configuration Component
 */
export function EndConfigForm({ config, onChange }: ConfigComponentProps) {
  // Output schema editor dialog state
  const [isDialogOutputJson, setIsDialogOutputJson] = useState(false)

  // Compute output json from config (recalculate when dialog opens or config changes)
  const outputJson = config?.workflowOutput?.schema
    ? JSON.stringify(config.workflowOutput.schema, null, 2)
    : JSON.stringify(
        {
          type: 'object',
          properties: {},
          additionalProperties: false,
          required: [],
          title: 'WorkflowOutput',
        },
        null,
        2
      )

  const hasSchema =
    config?.workflowOutput?.schema &&
    Object.keys(config.workflowOutput.schema.properties || {}).length > 0

  return (
    <div className="flex flex-col gap-2">
      {/* Output Schema */}
      <div className="flex justify-between gap-1">
        <Label>Output</Label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setIsDialogOutputJson(true)
          }}
        >
          {hasSchema && (
            <>
              <Braces />
              <span>
                {config?.workflowOutput?.schema?.title || 'Edit schema'}
              </span>
            </>
          )}
          {!hasSchema && (
            <>
              <Plus />
              <span>Add schema</span>
            </>
          )}
        </Button>
      </div>

      <DialogSchemaJSON
        type="end"
        open={isDialogOutputJson}
        onOpenChange={setIsDialogOutputJson}
        initialValue={outputJson}
        onUpdate={(value) => {
          const schema = JSON.parse(value)

          // Build the complete workflowOutput object
          const workflowOutput = {
            name: schema?.title || 'WorkflowOutput',
            strict: true,
            schema: schema,
          }

          // Generate expr.expression based on schema properties
          // Build a CEL expression string manually to handle different types correctly
          const exprParts: string[] = []

          if (schema.properties && typeof schema.properties === 'object') {
            Object.keys(schema.properties).forEach((key) => {
              const property = schema.properties[key]
              const defaultValue = property.default

              let valueStr: string

              // Check if default is a variable reference (__VAR__xxx__ENDVAR__)
              if (
                typeof defaultValue === 'string' &&
                defaultValue.startsWith('__VAR__') &&
                defaultValue.endsWith('__ENDVAR__')
              ) {
                // Extract variable path and use it directly without quotes
                const varPath = defaultValue.slice(7, -10) // Remove __VAR__ and __ENDVAR__
                valueStr = varPath
              } else if (property.type === 'string') {
                // String type
                if (defaultValue === '' || defaultValue === undefined) {
                  valueStr = '"undefined"'
                } else {
                  valueStr = JSON.stringify(defaultValue)
                }
              } else if (property.type === 'number') {
                // Number type
                valueStr =
                  defaultValue !== undefined ? String(defaultValue) : '0'
              } else if (property.type === 'boolean') {
                // Boolean type
                if (defaultValue === false || defaultValue === undefined) {
                  valueStr = 'undefined'
                } else {
                  valueStr = 'true'
                }
              } else {
                // Default fallback
                valueStr = '"undefined"'
              }

              exprParts.push(`"${key}": ${valueStr}`)
            })
          }

          const exprExpression = `{${exprParts.join(', ')}}`

          onChange({
            ...config,
            expr: {
              expression: exprExpression,
              format: 'cel',
            },
            workflowOutput,
          })
        }}
      />
    </div>
  )
}
