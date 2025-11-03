import { cn } from '@/lib/utils'
import { NodeResizer } from '@xyflow/react'
import { forwardRef, type HTMLAttributes } from 'react'
import { useHover } from 'react-use'

interface ResizableNodeProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
  minWidth?: number
  minHeight?: number
}

const controlStyle = {
  background: 'transparent',
  border: 'none',
}

/**
 * ResizableNode - Base component for resizable nodes (Note, While, etc.)
 * Supports user interaction to adjust node size
 */
export const ResizableNode = forwardRef<HTMLDivElement, ResizableNodeProps>(
  (
    { className, selected, minWidth = 50, minHeight = 40, children, ...props },
    ref
  ) => {
    const [hoverable, hovered] = useHover((hovered) => (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border-2 bg-background shadow-md transition-colors',
          'min-w-[140px] min-h-[80px]',
          className
        )}
        tabIndex={0}
        {...props}
      >
        hovered::::{hovered ? 'true' : 'false'}
        {children}
      </div>
    ))

    return (
      <>
        {hoverable}

        {/* export declare function NodeResizer({ nodeId, isVisible, handleClassName, handleStyle, lineClassName, lineStyle, color, minWidth, minHeight, maxWidth, maxHeight, keepAspectRatio, autoScale, shouldResize, onResizeStart, onResize, onResizeEnd, }: NodeResizerProps): import("react/jsx-runtime").JSX.Element | null; */}
        <NodeResizer
          isVisible={true}
          minWidth={minWidth}
          minHeight={minHeight}
          handleClassName={cn(
            '!size-[5px] !border-px opacity-0 !bg-primary/40 transition-opacity',
            hovered && 'opacity-100'
          )}
          lineClassName="!border-transparent"
        />
      </>
    )
  }
)
ResizableNode.displayName = 'ResizableNode'
