'use client'

import { Separator } from '@/components/ui/separator'
import { StartConfig, StateVariable } from '@/lib/nodes/definitions/start-node'
import { Plus } from 'lucide-react'
import { FormButton } from './components/form-button'
import { FormLabel } from './components/form-label'
import { VariableConfig } from './components/variable-config'
import { VariableItem } from './components/variable-item'

interface StartConfigProps {
  config: StartConfig
  onChange: (config: StartConfig) => void
}

/**
 * Start Node Configuration Form
 */
export function StartConfigForm({ config, onChange }: StartConfigProps) {
  // Add a new state variable
  const handleAddNewVariable = (variable: StateVariable) => {
    const newStateVars = [...(config.state_vars || []), variable]
    onChange({
      ...config,
      state_vars: newStateVars,
    })
  }

  // Remove a state variable
  const handleRemoveVariable = (index: number) => {
    const newStateVars = config.state_vars.filter((_, i) => i !== index)
    onChange({
      ...config,
      state_vars: newStateVars,
    })
  }

  // Update a state variable
  const handleVariableChange = (index: number, variable: StateVariable) => {
    const newStateVars = [...config.state_vars]
    newStateVars[index] = variable
    onChange({
      ...config,
      state_vars: newStateVars,
    })
  }

  const validateAddVariableName = (name: string) => {
    if (!name) {
      return 'Name is required'
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      return 'Name must be alphanumeric and start with a letter'
    }
    if (config.state_vars?.some((v) => v.name === name)) {
      return 'Name already exists'
    }
    return undefined
  }

  const validateEditVariableName = (name: string, currentIndex: number) => {
    if (!name) {
      return 'Name is required'
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      return 'Name must be alphanumeric and start with a letter'
    }
    if (
      config.state_vars?.some((v, i) => v.name === name && i !== currentIndex)
    ) {
      return 'Name already exists'
    }
    return undefined
  }

  return (
    <div className="flex flex-col gap-1">
      <div>
        <FormLabel>Input variables</FormLabel>
        <VariableItem
          variable={{
            id: 'input_as_text',
            name: 'input_as_text',
            type: 'string',
          }}
        />
      </div>

      <Separator className="mt-3 mb-1" />

      <div>
        <FormLabel>State variables</FormLabel>

        <div className="flex flex-col gap-2">
          {config.state_vars?.map((variable, index) => (
            <VariableItem
              key={variable.id}
              variable={variable}
              onChange={(updatedVar) => handleVariableChange(index, updatedVar)}
              onRemove={() => handleRemoveVariable(index)}
              validation={(name) => validateEditVariableName(name, index)}
              showDefaultValue={true}
              showEditButton={true}
              showDeleteButton={true}
            />
          ))}

          <div key="add-variable-button">
            <VariableConfig
              variable={{
                id: `var_${Date.now()}`,
                name: '',
                type: 'string',
              }}
              onSave={handleAddNewVariable}
              validation={validateAddVariableName}
            >
              <FormButton>
                <Plus className="size-3.5" />
                Add
              </FormButton>
            </VariableConfig>
          </div>
        </div>
      </div>
    </div>
  )
}
