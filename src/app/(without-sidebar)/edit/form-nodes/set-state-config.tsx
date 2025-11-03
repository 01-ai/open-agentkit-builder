'use client'

import { useCanvas } from '@/app/(without-sidebar)/edit/canvas/canvas-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  SetStateAssignment,
  SetStateConfig,
} from '@/lib/nodes/definitions/set-state-node'
import { StartConfig, StateVariable } from '@/lib/nodes/definitions/start-node'
import { AlertTriangle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FormButton } from './components/form-button'
import { FormRemoveButton } from './components/form-remove-button'
import {
  FormSelect,
  FormSelectContent,
  FormSelectItem,
  FormSelectTrigger,
  FormSelectValue,
} from './components/form-select'
import { FormTextarea } from './components/form-textarea'
import { VariableConfig } from './components/variable-config'
import { VariableItem } from './components/variable-item'

// Extended state variable with full path for nested properties
interface FlattenedVariable extends StateVariable {
  fullPath: string // e.g., "obj.attr1" or "str"
  displayName: string // e.g., "attr1" or "str"
  parentName?: string // e.g., "obj" for nested properties
}

interface SetStateConfigProps {
  nodeId: string
  config: SetStateConfig
  onChange: (config: SetStateConfig) => void
}

/**
 * Flatten state variables to include object properties as selectable options
 */
function flattenStateVariables(
  stateVars: StateVariable[]
): FlattenedVariable[] {
  const flattened: FlattenedVariable[] = []

  stateVars.forEach((variable) => {
    // Add the top-level variable
    flattened.push({
      ...variable,
      fullPath: variable.name,
      displayName: variable.name,
    })

    // If it's an object type, expand its properties
    if (variable.type === 'object' && variable.default) {
      const defaultObj = variable.default as Record<string, unknown>

      // Check if default is a JSON Schema with properties
      if (
        defaultObj &&
        typeof defaultObj === 'object' &&
        'properties' in defaultObj
      ) {
        const properties = defaultObj.properties as Record<
          string,
          Record<string, unknown>
        >

        // Add each property as a selectable option
        Object.entries(properties).forEach(([propName, propSchema]) => {
          let propType: StateVariable['type'] = 'string'

          // Determine property type from schema
          switch (propSchema.type) {
            case 'string':
              propType = 'string'
              break
            case 'number':
              propType = 'number'
              break
            case 'boolean':
              propType = 'boolean'
              break
            case 'array':
              propType = 'array'
              break
            case 'object':
              propType = 'object'
              break
          }

          flattened.push({
            id: `${variable.id}.${propName}`,
            name: propName,
            type: propType,
            default: propSchema.default as StateVariable['default'],
            fullPath: `${variable.name}.${propName}`,
            displayName: propName,
            parentName: variable.name,
          })
        })
      }
    }
  })

  return flattened
}

export function SetStateConfigForm({ config, onChange }: SetStateConfigProps) {
  const { nodes, setNodes } = useCanvas()
  const [addVariableOpen, setAddVariableOpen] = useState<number | null>(null) // Track which assignment is adding a variable

  // Get Start node
  const startNode = useMemo(() => {
    return nodes.find((n) => n.type === 'start')
  }, [nodes])

  // Get state variables from Start node (original)
  const originalStateVariables = useMemo(() => {
    if (!startNode) return []

    const startConfig = startNode.data?.config as StartConfig
    return startConfig?.state_vars || []
  }, [startNode])

  // Get flattened state variables (including object properties)
  const stateVariables = useMemo(() => {
    return flattenStateVariables(originalStateVariables)
  }, [originalStateVariables])

  // Check for duplicate variable names
  const hasDuplicateVariables = useMemo(() => {
    const variableNames = config.assignments
      .map((a) => a.name)
      .filter((name) => name && name.trim() !== '')

    const uniqueNames = new Set(variableNames)
    return variableNames.length !== uniqueNames.size
  }, [config.assignments])

  // Add new variable to Start node
  const handleAddNewVariable = (variable: StateVariable) => {
    if (!startNode) return

    const startConfig = startNode.data?.config as StartConfig
    const newStateVars = [...originalStateVariables, variable]

    // Update Start node config
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === startNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...startConfig,
                  state_vars: newStateVars,
                },
              },
            }
          : node
      )
    )
  }

  // Validate new variable name
  const validateAddVariableName = (name: string) => {
    if (!name) {
      return 'Name is required'
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      return 'Name must be alphanumeric and start with a letter'
    }
    if (originalStateVariables.some((v) => v.name === name)) {
      return 'Name already exists'
    }
    return undefined
  }

  // Add a new assignment
  const handleAddAssignment = () => {
    const newAssignment: SetStateAssignment = {
      expression: {
        expression: '',
        format: 'cel',
      },
      name: '', // Will be selected from dropdown
    }

    onChange({
      ...config,
      assignments: [...(config.assignments || []), newAssignment],
    })
  }

  // Remove an assignment
  const handleRemoveAssignment = (index: number) => {
    const newAssignments = config.assignments.filter((_, i) => i !== index)
    onChange({
      ...config,
      assignments: newAssignments,
    })
  }

  // Update assignment expression
  const handleExpressionChange = (index: number, expression: string) => {
    const newAssignments = [...config.assignments]
    newAssignments[index] = {
      ...newAssignments[index],
      expression: {
        ...newAssignments[index].expression,
        expression,
      },
    }
    onChange({
      ...config,
      assignments: newAssignments,
    })
  }

  // Update assignment variable name (use fullPath for nested properties)
  const handleVariableNameChange = (index: number, fullPath: string) => {
    const newAssignments = [...config.assignments]
    newAssignments[index] = {
      ...newAssignments[index],
      name: fullPath, // Store full path like "obj.attr1" or "str"
    }
    onChange({
      ...config,
      assignments: newAssignments,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Duplicate Variable Warning */}
      {hasDuplicateVariables && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 !text-red-600" />
          <AlertDescription className="text-red-600">
            A variable with this name already exists.
          </AlertDescription>
        </Alert>
      )}

      {/* Assignments List */}
      {config.assignments?.map((assignment, index) => (
        <div key={index} className="flex flex-col gap-2">
          {/* Assign value */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 justify-between w-full">
              <span className="text-sm">Assign value</span>
              <FormRemoveButton onClick={() => handleRemoveAssignment(index)} />
            </div>

            <FormTextarea
              value={assignment.expression.expression}
              onValueChange={(value: string) =>
                handleExpressionChange(index, value)
              }
              placeholder="input.foo + 1"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use Common Expression Language to create a custom expression.{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Learn more.
              </a>
            </p>
          </div>

          {/* To variable */}
          <div className="space-y-1">
            <div>
              <span className="text-sm">To variable</span>
            </div>

            <div className="relative" id={`select-container-${index}`}>
              <FormSelect
                value={assignment.name || ''}
                onValueChange={(value) => {
                  if (value === '__add_variable__') {
                    // 延迟打开，确保 Select 完全关闭
                    setTimeout(() => {
                      setAddVariableOpen(index)
                    }, 100)
                    return
                  }
                  handleVariableNameChange(index, value)
                }}
              >
                <FormSelectTrigger>
                  {assignment.name ? (
                    (() => {
                      const selectedVar = stateVariables.find(
                        (v) => v.fullPath === assignment.name
                      )
                      if (!selectedVar) return <FormSelectValue />

                      return <VariableItem variable={selectedVar} />
                    })()
                  ) : (
                    <FormSelectValue placeholder="Select" />
                  )}
                </FormSelectTrigger>
                <FormSelectContent>
                  {stateVariables.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No state variables available
                    </div>
                  )}
                  {stateVariables.map((variable) => (
                    <FormSelectItem key={variable.id} value={variable.fullPath}>
                      <div className={variable.parentName ? 'pl-4' : ''}>
                        <VariableItem variable={variable} />
                      </div>
                    </FormSelectItem>
                  ))}

                  {/* Add variable option */}
                  <>
                    <div className="h-px bg-border my-1" />
                    <FormSelectItem value="__add_variable__">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        <span>Add variable</span>
                      </div>
                    </FormSelectItem>
                  </>
                </FormSelectContent>
              </FormSelect>

              {/* Add Variable Popover (always rendered, controlled by open state) */}
              <div
                className="absolute top-full left-full mt-1 pointer-events-none"
                style={{
                  visibility: addVariableOpen === index ? 'visible' : 'hidden',
                }}
              >
                <VariableConfig
                  variable={{
                    id: `var_${Date.now()}`,
                    name: '',
                    type: 'string',
                  }}
                  onSave={(variable) => {
                    handleAddNewVariable(variable)
                    setAddVariableOpen(null)
                  }}
                  validation={validateAddVariableName}
                  open={addVariableOpen === index}
                  onOpenChange={(open) => {
                    if (!open) {
                      setAddVariableOpen(null)
                    }
                  }}
                >
                  {/* Invisible anchor positioned below the select */}
                  <div className="w-px h-px pointer-events-auto" />
                </VariableConfig>
              </div>
            </div>
          </div>

          {index !== config.assignments.length - 1 && (
            <div className="mt-4 h-px bg-[#ededed]"></div>
          )}
        </div>
      ))}

      {/* Add Button */}
      <FormButton onClick={handleAddAssignment} className="w-fit">
        <Plus className="h-4 w-4" />
        Add
      </FormButton>
    </div>
  )
}
