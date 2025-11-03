import { cn } from '@/lib/utils'
import { Handle, Position, type HandleProps } from '@xyflow/react'
import React, { CSSProperties } from 'react'

export const StandardHandle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    Omit<HandleProps, 'position'> & {
      position?: Position
    }
>(({ className, ...props }, ref) => {
  const computedStyle: CSSProperties = {
    background: '#fff',
    ...props.style,
  }

  return (
    <Handle
      ref={ref}
      className={cn(
        '!size-2 ring-1 !bg-background ring-[color:color-mix(in_oklch,var(--primary)_20%,white)]',
        '[.selected_&]:ring-[color:color-mix(in_oklch,var(--primary)_30%,white)]',
        className
      )}
      style={computedStyle}
      position={
        props.position !== undefined
          ? props.position
          : props.type === 'source'
            ? Position.Right
            : Position.Left
      }
      {...props}
    />
  )
})
