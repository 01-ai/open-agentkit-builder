'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { nodeRegistry } from '@/lib/nodes/registry'
import { Trash2Icon } from 'lucide-react'

/**
 * Node Configuration Panel
 * Displays in top-right corner when a node is selected
 */
export function NodeConfigPanel({
  nodeId,
  nodeType,
  config,
  onChange,
  onDelete,
  previewOpen,
}: {
  nodeId: string
  nodeType: string
  config: any
  onChange: (newConfig: any) => void
  onDelete: () => void
  previewOpen?: boolean
}) {
  const definition = nodeRegistry.get(nodeType)

  if (!definition) {
    return null
  }

  const ConfigComponent = definition.ConfigComponent

  return (
    <div
      className="absolute top-0 right-2.5 w-[360px] max-h-[calc(100vh-70px)] bg-background rounded-xl z-50 overflow-hidden flex flex-col pt-4 pb-3"
      style={{ right: previewOpen ? 520 + 16 : undefined }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1 flex-shrink-0 pr-8 pl-4 pb-4">
        <h3 className="font-semibold">{definition.label}</h3>
        <p className="text-sm text-muted-foreground">
          {definition.description}
        </p>
        {nodeType !== 'builtins.Start' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 p-0 hover:bg-primary/10 absolute top-4 right-4"
                onClick={onDelete}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" alignOffset={-12}>
              Delete step
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4">
        <ConfigComponent nodeId={nodeId} config={config} onChange={onChange} />
      </div>
    </div>
  )
}
