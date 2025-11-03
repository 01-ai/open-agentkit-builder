import { Label } from '@/components/ui/label'

import { ConfigComponentProps } from '@/lib/nodes/types'
import { setNestedValue } from '@/lib/utils/path-utils'
import { FormInput } from './components/form-input'
import { FormTextarea } from './components/form-textarea'

export const FileSearchConfig: React.FC<ConfigComponentProps> = ({
  nodeId, // eslint-disable-line @typescript-eslint/no-unused-vars
  config,
  onChange,
}) => {
  // Helper function to update nested config fields
  const updateField = (path: string, value: string) => {
    const newConfig = JSON.parse(JSON.stringify(config)) // Deep clone
    setNestedValue(newConfig, path, value)
    onChange(newConfig)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Vector store */}
      <div className="flex flex-col gap-1">
        <Label className="leading-8">Vector store</Label>
        <FormInput
          value={config.vector_store_id || ''}
          onValueChange={(value: string) =>
            updateField('vector_store_id', value)
          }
          placeholder="Enter vector store id"
        />
      </div>

      {/* Max results */}
      <div className="flex flex-col gap-1">
        <Label className="leading-8">Max results</Label>
        <FormInput
          type="number"
          value={config.max_results || ''}
          onValueChange={(value: string) => updateField('max_results', value)}
          placeholder="Max results"
        />
      </div>

      {/* Query */}
      <div className="flex flex-col gap-1">
        <Label className="leading-8">Query</Label>
        <FormTextarea
          value={config.query?.expression || ''}
          onValueChange={(value: string) =>
            updateField('query.expression', value)
          }
          placeholder="Enter file search input. Use {{ curly braces }} to insert variables."
          rows={4}
        />
      </div>
    </div>
  )
}
