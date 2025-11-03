'use client'

import { VariableTypeBooleanIcon } from '@/components/ui/icons/variable-type-boolean-icon'
import { VariableTypeListIcon } from '@/components/ui/icons/variable-type-list-icon'
import { VariableTypeNumberIcon } from '@/components/ui/icons/variable-type-number-icon'
import { VariableTypeObjectIcon } from '@/components/ui/icons/variable-type-object-icon'
import { VariableTypeStringIcon } from '@/components/ui/icons/variable-type-string-icon'
import { StateVariable } from '@/lib/nodes/definitions/start-node'
import { FormRemoveButton } from './form-remove-button'
import { FormSettingButton } from './form-setting-button'
import { VariableConfig } from './variable-config'

interface VariableItemProps {
  variable: StateVariable
  onChange?: (variable: StateVariable) => void
  onRemove?: () => void
  showDefaultValue?: boolean
  showEditButton?: boolean
  showDeleteButton?: boolean
  validation?: (name: string) => string | undefined
}

/**
 * Get icon component for variable type
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'string':
      return <VariableTypeStringIcon className="size-4 text-green-600" />
    case 'number':
      return <VariableTypeNumberIcon className="size-4 text-blue-600" />
    case 'boolean':
      return <VariableTypeBooleanIcon className="size-4 text-orange-600" />
    case 'object':
      return <VariableTypeObjectIcon className="size-4 text-purple-600" />
    case 'array':
      return <VariableTypeListIcon className="size-4 text-pink-600" />
    case 'unknown':
      // Unknown type - show empty circle icon without color
      return (
        <svg
          className="size-4 text-muted-foreground"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    default:
      return <VariableTypeStringIcon className="size-4 text-green-600" />
  }
}

/**
 * Get display text for variable type
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
    array: 'array',
    unknown: '', // Unknown type - no label displayed
  }
  return labels[type] || type
}

/**
 * Format default value for display
 */
function formatDefaultValue(
  value: string | number | boolean | object | unknown[] | undefined,
  type: string
): string {
  if (value === undefined || value === null) {
    return ''
  }

  switch (type) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      return `${value}`
    case 'array':
    case 'object':
      return JSON.stringify(value)
    default:
      return `"${value}"`
  }
}

/**
 * Variable Item Component
 * Displays a single variable in a compact format with optional edit/delete actions
 */
export function VariableItem({
  variable,
  onChange,
  onRemove,
  showDefaultValue = false,
  showEditButton = false,
  showDeleteButton = false,
  validation,
}: VariableItemProps) {
  const defaultValueStr = formatDefaultValue(variable.default, variable.type)

  return (
    <div>
      <div className="flex items-center gap-2">
        {getTypeIcon(variable.type)}

        <div className="flex-1 min-w-0 truncate text-sm">{variable.name}</div>

        <span className="text-xs text-muted-foreground flex-shrink-0">
          {getTypeLabel(variable.type)}
        </span>
        {showEditButton && onChange && (
          <VariableConfig
            variable={variable}
            onSave={onChange}
            validation={validation}
          >
            <FormSettingButton className="size-6 rounded-full" />
          </VariableConfig>
        )}
        {showDeleteButton && (
          <FormRemoveButton
            onClick={onRemove ?? (() => {})}
            className="size-6 rounded-full"
          />
        )}
      </div>

      {showDefaultValue && defaultValueStr && variable.type !== 'object' && (
        <div className="text-xs text-muted-foreground truncate">
          {defaultValueStr}
        </div>
      )}
    </div>
  )
}
