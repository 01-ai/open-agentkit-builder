'use client'

import { useCanvas } from '@/app/(without-sidebar)/edit/canvas/canvas-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TransformConfig,
  TransformExpression,
} from '@/lib/nodes/definitions/transform-node'
import { Braces, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DialogSchemaJSON } from './components/dialog-schema-json'
import { FormButton } from './components/form-button'
import { FormInput } from './components/form-input'
import { FormRemoveButton } from './components/form-remove-button'
import { FormTextarea } from './components/form-textarea'

interface TransformConfigProps {
  nodeId: string
  config: TransformConfig
  onChange: (config: TransformConfig) => void
}

export function TransformConfigForm({
  nodeId,
  config,
  onChange,
}: TransformConfigProps) {
  const { getNode, updateNodeLabel } = useCanvas()

  // node label
  const nodeLabel = useMemo(() => {
    return getNode(nodeId)?.data?.label || ''
  }, [getNode, nodeId])

  // Convert expressions to JSON string
  const expressionsToJsonStr = (expression: TransformExpression[]) => {
    const newObj: Record<string, string> = {}
    expression.forEach((item) => {
      newObj[item.key] = item.expression
    })
    return JSON.stringify(newObj)
  }

  // Add a new expression
  const handleAddExpression = () => {
    const newExpressionId = `expression_${Date.now()}`
    const newExpression = {
      id: newExpressionId,
      key: '',
      expression: '',
    }
    const newExpressions = [...(config.expressions || []), newExpression]

    onChange({
      ...config,
      expr: {
        expression: expressionsToJsonStr(newExpressions),
        format: 'cel',
      },
      expressions: newExpressions,
    })
  }

  // Remove an expression
  const handleRemoveExpression = (index: number) => {
    const newExpressions =
      config.expressions?.filter((_, i) => i !== index) || []
    onChange({
      ...config,
      expr: {
        expression: expressionsToJsonStr(newExpressions),
        format: 'cel',
      },
      expressions: newExpressions,
    })
  }

  // Update expression key
  const handleExpressionKeyChange = (index: number, key: string) => {
    const newExpressions = [...(config.expressions || [])]
    newExpressions[index] = {
      ...newExpressions[index],
      key,
    }
    onChange({
      ...config,
      expr: {
        expression: expressionsToJsonStr(newExpressions),
        format: 'cel',
      },
      expressions: newExpressions,
    })
  }

  // Update expression value
  const handleExpressionValueChange = (index: number, expression: string) => {
    const newExpressions = [...(config.expressions || [])]
    newExpressions[index] = {
      ...newExpressions[index],
      expression,
    }
    onChange({
      ...config,
      expr: {
        expression: expressionsToJsonStr(newExpressions),
        format: 'cel',
      },
      expressions: newExpressions,
    })
  }

  // Extract default values from schema properties
  const schemaToDefaultValues = (schema: any) => {
    if (!schema || typeof schema !== 'object') {
      return '{}'
    }

    // Parse schema if it's a string
    const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema

    // Extract properties
    const properties = schemaObj.properties || {}
    const defaultValues: Record<string, any> = {}

    // Build object with default values (only include properties that have default values)
    Object.keys(properties).forEach((key) => {
      const property = properties[key]
      if (property && typeof property === 'object' && 'default' in property) {
        defaultValues[key] = property.default
      }
    })

    return JSON.stringify(defaultValues)
  }

  // Update object schema
  const handleObjectSchemaChange = (schemaStr: string) => {
    const schema = JSON.parse(schemaStr)

    onChange({
      ...config,
      expr: {
        expression: schemaToDefaultValues(schema),
        format: 'cel',
      },
      objectSchema: {
        name: 'ObjectSchema',
        strict: true,
        schema: schema,
      },
      outputKind: 'object',
    })
  }

  // Switch to expressions mode
  const handleSwitchToExpressions = () => {
    onChange({
      ...config,
      expr: {
        expression: expressionsToJsonStr(config.expressions || []),
        format: 'cel',
      },
      outputKind: 'expressions',
    })
  }

  // Switch to object mode
  const handleSwitchToObject = () => {
    onChange({
      ...config,
      expr: {
        expression: schemaToDefaultValues(config?.objectSchema?.schema),
        format: 'cel',
      },
      outputKind: 'object',
    })
  }

  const currentOutputKind = config.outputKind || 'expressions'

  // schema json editor dialog state
  const [isDialogSchemaJson, setIsDialogSchemaJson] = useState(false)
  const [schemaJson, setSchemaJson] = useState('')

  // 获取schema json初始数据
  useEffect(() => {
    if (config?.objectSchema?.schema) {
      setSchemaJson(JSON.stringify(config.objectSchema.schema, null, 2))
    }
  }, [config?.objectSchema?.schema])

  return (
    <div className="flex flex-col gap-4">
      {/* Name field */}
      <FormInput
        label="Name"
        value={nodeLabel as string}
        onValueChange={(value: string) => updateNodeLabel?.(nodeId, value)}
        placeholder="Transform"
      />

      {/* Tabs for Expressions vs Object */}
      <Tabs
        value={currentOutputKind}
        onValueChange={(value) => {
          if (value === 'expressions') {
            handleSwitchToExpressions()
          } else if (value === 'object') {
            handleSwitchToObject()
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expressions">Expressions</TabsTrigger>
          <TabsTrigger value="object">Object</TabsTrigger>
        </TabsList>

        {/* Expressions Tab */}
        <TabsContent value="expressions" className="space-y-3">
          <div className="flex flex-col gap-3">
            {config.expressions?.map((expression, index) => (
              <div
                key={expression.id}
                className="flex flex-col gap-2 pb-4 border-b"
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    Expression {index + 1}
                  </div>
                  <FormRemoveButton
                    onClick={() => handleRemoveExpression(index)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FormInput
                    label="Key"
                    value={expression.key}
                    onValueChange={(value: string) =>
                      handleExpressionKeyChange(index, value)
                    }
                    placeholder=""
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`value-${index}`} className="leading-8">
                      Value
                    </Label>
                    <FormTextarea
                      value={expression.expression}
                      onValueChange={(value: string) =>
                        handleExpressionValueChange(index, value)
                      }
                      placeholder="input.foo + 1"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Use Common Expression Language to create a custom expression.{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Learn more.
                  </a>
                </p>
              </div>
            ))}

            <div>
              <FormButton onClick={handleAddExpression}>
                <Plus className="size-3.5" />
                Add
              </FormButton>
            </div>
          </div>
        </TabsContent>

        {/* Object Tab */}
        <TabsContent value="object" className="space-y-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsDialogSchemaJson(true)
            }}
          >
            {config?.objectSchema?.schema && (
              <>
                <Braces />
                <span>Edit schema</span>
              </>
            )}
            {!config?.objectSchema?.schema && (
              <>
                <Plus />
                <span>Add schema</span>
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>

      <DialogSchemaJSON
        type="agent"
        open={isDialogSchemaJson}
        onOpenChange={setIsDialogSchemaJson}
        initialValue={schemaJson}
        onUpdate={(value) => {
          try {
            handleObjectSchemaChange(value)
          } catch (err) {
            // Error already displayed via toast, just prevent dialog from closing
            console.error('Failed to update JSON schema:', err)
          }
        }}
      />
    </div>
  )
}
