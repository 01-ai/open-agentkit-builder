import { getNodeConfig, type NodeType } from '@/lib/node-configs'
import { cn } from '@/lib/utils'

interface NodeIconProps {
  nodeType: NodeType
  className?: string
  iconClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: {
    container: 'w-6 h-6',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    container: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'w-10 h-10',
    icon: 'w-5 h-5',
  },
}

/**
 * Node Icon Component
 * Displays a node icon with background color based on node type
 * Icon uses default text color (black)
 */
export function NodeIcon({
  nodeType,
  className,
  iconClassName,
  size = 'md',
}: NodeIconProps) {
  const config = getNodeConfig(nodeType)

  if (!config) {
    return null
  }

  const Icon = config.icon
  const sizes = sizeMap[size]

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded',
        sizes.container,
        config.color || 'bg-muted',
        className
      )}
    >
      <Icon className={cn(sizes.icon, 'text-foreground', iconClassName)} />
    </div>
  )
}
