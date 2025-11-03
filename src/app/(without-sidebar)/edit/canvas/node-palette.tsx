'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { nodeConfigs, type NodeConfig, type NodeType } from '@/lib/node-configs'
import { cn } from '@/lib/utils'

/**
 * Node Palette - Left sidebar with draggable nodes
 */

// Re-export types for backward compatibility
export type { NodeConfig, NodeType }

// Node item in the sidebar
function NodeItem({
  config,
  onAddNode,
}: {
  config: NodeConfig
  onAddNode: (config: NodeConfig) => void
}) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', config.type)
    event.dataTransfer.setData('application/reactflow-label', config.label)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Tooltip delayDuration={600}>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium select-none"
          draggable
          onDragStart={onDragStart}
          onClick={() => onAddNode(config)}
        >
          <div
            className={cn(
              'flex items-center justify-center size-6 rounded-md',
              config.color || 'bg-muted'
            )}
          >
            <config.icon className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span>{config.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p className="text-sm">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Category display names
const categoryLabels: Record<string, string> = {
  core: 'Core',
  tools: 'Tools',
  logic: 'Logic',
  data: 'Data',
}

export function NodePalette({
  onAddNode,
  className,
}: {
  onAddNode: (config: NodeConfig) => void
  className?: string
}) {
  // Group nodes by category
  const nodesByCategory = nodeConfigs.reduce(
    (acc, config) => {
      if (!config.hidden) {
        if (!acc[config.category]) {
          acc[config.category] = []
        }
        acc[config.category].push(config)
      }
      return acc
    },
    {} as Record<string, NodeConfig[]>
  )

  // Get categories in order
  const categories = ['core', 'tools', 'logic', 'data'].filter(
    (cat) => nodesByCategory[cat]?.length > 0
  )

  return (
    <div
      className={cn(
        'w-50 border rounded-2xl bg-background overflow-y-auto',
        className
      )}
    >
      <div className="px-2 pt-3.5 pb-2 space-y-1.5 max-h-[calc(100vh-5rem)] overflow-y-auto">
        {categories.map((category) => (
          <div key={category}>
            <div className="text-xs text-muted-foreground mb-0.75 ml-2">
              {categoryLabels[category] || category}
            </div>
            <div>
              {nodesByCategory[category].map((config) => (
                <NodeItem
                  key={config.type}
                  config={config}
                  onAddNode={onAddNode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
