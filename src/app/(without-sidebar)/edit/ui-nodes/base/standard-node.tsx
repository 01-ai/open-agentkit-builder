import { NodeIcon } from '@/components/ui/node-icon'
import { type NodeType } from '@/lib/node-configs'
import { cn } from '@/lib/utils'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

interface StandardNodeProps extends HTMLAttributes<HTMLDivElement> {
  nodeType: NodeType
  label: string
  defaultLabel?: string
  subtitle?: string
  selected?: boolean
  borderColor?: string
  children?: ReactNode
}

/**
 * StandardNode - Base component for standard nodes with unified header
 * Displays icon and label from nodeConfigs
 */
export const StandardNode = forwardRef<HTMLDivElement, StandardNodeProps>(
  (
    {
      nodeType,
      label,
      defaultLabel,
      subtitle,
      selected,
      borderColor,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const defaultSubtitle = !label && defaultLabel ? defaultLabel : undefined
    const displaySubtitle = subtitle || defaultSubtitle

    return (
      <div
        ref={ref}
        className={cn(
          'bg-background rounded-2xl pl-2.5 pr-4 py-2.5 max-w-[400px] transition-colors text-xs',
          selected &&
            'ring-1 ring-[color:color-mix(in_oklch,var(--primary)_30%,white)]',
          borderColor || 'border-border hover:border-border/80',
          className
        )}
        tabIndex={0}
        {...props}
      >
        <div className="flex items-center gap-2">
          <NodeIcon nodeType={nodeType} size="md" />
          <div className="has-[[data-subtitle]]:-mt-[2.5px]">
            <div className="text-primary font-medium text-xs leading-tight ">
              {label}
            </div>
            {displaySubtitle && (
              <div
                data-subtitle
                className="text-[0.625rem] text-muted-foreground leading-tight truncate max-w-[150px]"
              >
                {displaySubtitle}
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    )
  }
)
StandardNode.displayName = 'StandardNode'
