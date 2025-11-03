'use client'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  StateVariable,
  StateVariableType,
} from '@/lib/nodes/definitions/start-node'
import { cn } from '@/lib/utils'
import { AlertTriangle, Braces, Plus } from 'lucide-react'
import { useState } from 'react'
import { DialogSchemaJSON } from './dialog-schema-json'
import { FormButton } from './form-button'
import { FormInput } from './form-input'
import { FormLabel } from './form-label'
import {
  FormSelect,
  FormSelectContent,
  FormSelectItem,
  FormSelectTrigger,
  FormSelectValue,
} from './form-select'
import { FormSettingButton } from './form-setting-button'
import { FormTagsInput } from './form-tags-input'

interface VariableConfigProps {
  variable: StateVariable
  onChange: (variable: StateVariable) => void
  showRemoveButton?: boolean
  nameError?: string
  onSaveChanges?: () => void
}

/**
 * Variable Configuration Component
 * Reusable component for editing state variables
 */
export function VariableConfigForm({
  variable,
  onChange,
  nameError,
  onSaveChanges,
}: VariableConfigProps) {
  const handleTypeChange = (newType: string) => {
    const updatedVariable: StateVariable = {
      ...variable,
      type: newType as StateVariableType,
    }
    onChange(updatedVariable)
  }

  // Handle name change
  const handleNameChange = (newName: string) => {
    onChange({
      ...variable,
      name: newName,
      id: newName, // id follows name
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onSaveChanges) {
      onSaveChanges()
    }
  }

  // Handle default value change
  const handleDefaultChange = (newValue: string) => {
    let parsedValue: StateVariable['default'] = newValue

    // Parse value based on type
    switch (variable.type) {
      case 'number':
        parsedValue = newValue ? parseFloat(newValue) : undefined
        break
      case 'boolean':
        parsedValue = newValue === 'true'
        break
      case 'array':
        try {
          parsedValue = newValue ? JSON.parse(newValue) : undefined
        } catch {
          parsedValue = []
        }
        break
      case 'object':
        try {
          parsedValue = newValue ? JSON.parse(newValue) : undefined
        } catch {
          parsedValue = {}
        }
        break
      default:
        parsedValue = newValue || undefined
    }

    onChange({
      ...variable,
      default: parsedValue,
    })
  }

  const handleDefaultArrayChange = (newValue: string[]) => {
    onChange({
      ...variable,
      default: newValue,
    })
  }

  // Get string representation of default value for display
  const getDefaultValueString = (): string => {
    if (variable.default === undefined || variable.default === null) {
      return ''
    }

    switch (variable.type) {
      case 'boolean':
        return variable.default ? 'true' : 'false'
      case 'array':
      case 'object':
        return JSON.stringify(variable.default)
      default:
        return String(variable.default)
    }
  }

  const variableTypes: StateVariableType[] = [
    'string',
    'number',
    'boolean',
    'object',
    'array',
  ]

  // schema json editor dialog state
  const [isDialogSchemaJson, setIsDialogSchemaJson] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-2">
        <Tabs value={variable.type} onValueChange={handleTypeChange}>
          <TabsList className="h-8 w-full bg-primary/10 border rounded-lg px-px gap-0.5">
            {variableTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className={cn(
                  'flex-1 text-xs  h-7 rounded-md capitalize font-semibold',
                  'text-primary/80 data-[state=active]:text-primary',
                  'hover:bg-primary/10 data-[state=active]:bg-white'
                )}
              >
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div>
        <FormLabel>Name</FormLabel>
        <FormInput
          value={variable.name}
          onValueChange={handleNameChange}
          placeholder="Enter the variable name"
          onKeyDown={handleKeyDown}
        />
        {nameError && (
          <Alert className="mt-2 border border-warning/10 bg-warning/5 text-warning-foreground">
            <AlertTriangle className="-translate-y-[2px]" />
            <AlertTitle className="text-xs">{nameError}</AlertTitle>
          </Alert>
        )}
      </div>

      <div>
        {variable.type !== 'object' && (
          <FormLabel className="flex items-baseline gap-1">
            <span>Default value</span>
            <span className="text-xs text-muted-foreground">Optional</span>
          </FormLabel>
        )}

        {variable.type === 'boolean' ? (
          <FormSelect
            value={
              variable.default === undefined ? '' : String(variable.default)
            }
            onValueChange={handleDefaultChange}
          >
            <FormSelectTrigger>
              <FormSelectValue placeholder="Select a value" />
            </FormSelectTrigger>
            <FormSelectContent>
              <FormSelectItem value="true">True</FormSelectItem>
              <FormSelectItem value="false">False</FormSelectItem>
            </FormSelectContent>
          </FormSelect>
        ) : variable.type === 'array' ? (
          <FormTagsInput
            value={Array.isArray(variable.default) ? variable.default : []}
            onChange={handleDefaultArrayChange}
            placeholder={
              variable.default &&
              Array.isArray(variable.default) &&
              variable.default?.length > 0
                ? ''
                : 'New variable(press enter to add)'
            }
          />
        ) : variable.type === 'object' ? (
          <Button
            className="bg-primary/10 mt-1"
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsDialogSchemaJson(true)
            }}
          >
            {variable.default ? (
              <>
                <Braces />
                <span>Edit schema</span>
              </>
            ) : (
              <>
                <Plus />
                <span>Add schema</span>
              </>
            )}
          </Button>
        ) : (
          <FormInput
            value={getDefaultValueString()}
            onValueChange={handleDefaultChange}
            placeholder="New variable"
            type={variable.type === 'number' ? 'number' : 'text'}
          />
        )}
      </div>

      <DialogSchemaJSON
        open={isDialogSchemaJson}
        onOpenChange={setIsDialogSchemaJson}
        initialValue={JSON.stringify(variable.default, null, 2)}
        onUpdate={(value) => {
          handleDefaultChange(value)
        }}
      />
    </div>
  )
}

/**
 * using Popover to wrap it
 */
export function VariableConfig({
  variable,
  onSave,
  children,
  validation,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  variable: StateVariable
  onSave: (variable: StateVariable) => void
  children?: React.ReactNode
  validation?: (name: string) => string | undefined
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [variableState, setVariableState] = useState(variable)
  const [nameError, setNameError] = useState<string | undefined>()
  const [isShaking, setIsShaking] = useState(false)

  // Use controlled or uncontrolled open state
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const handleSave = () => {
    if (validation) {
      const error = validation(variableState.name)
      if (error) {
        setNameError(error)
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 820)
        return
      }
    }
    setNameError(undefined)
    onSave(variableState)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ? (
          children
        ) : (
          <FormSettingButton onClick={() => setOpen(true)} />
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-3 w-92',
          'data-[state=open]:animate-none',
          isShaking && 'shake'
        )}
      >
        <VariableConfigForm
          variable={variableState}
          onChange={setVariableState}
          nameError={nameError}
          onSaveChanges={handleSave}
        />
        <div className="flex justify-end mt-4">
          <FormButton variant="default" onClick={handleSave}>
            Save
          </FormButton>
        </div>
      </PopoverContent>
    </Popover>
  )
}
