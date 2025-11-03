'use client'

import { WhileIcon } from '@/components/ui/icons/node-while-icon'
import { cn } from '@/lib/utils'
import { type NodeProps, NodeResizer, Position } from '@xyflow/react'
import { memo } from 'react'
import { StandardHandle } from './base/standard-handle'

const WhileNodeComponent = ({ selected }: NodeProps) => {
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        handleClassName={cn('!size-[5px] !border-px')}
        lineClassName="!border-transparent"
      />
      <div
        className={cn(
          'rounded-2xl border border-dashed border-primary/20 bg-transparent',
          'w-full h-full py-2.5 pl-2.5 pr-4',
          selected ? 'shadow-lg shadow-primary/5' : 'shadow-none'
        )}
      >
        <div className="text-primary/40 text-xs">
          <WhileIcon />
          While
        </div>
      </div>

      {/* dummy handle for internal connection
      because react flow doesn't support support target-to-target connections even with connectionMode="loose".
      https://reactflow.dev/api-reference/react-flow#connectionmode
      */}
      <StandardHandle
        id="dummy-in"
        type="source"
        className="z-0 opacity-0 pointer-events-none"
        position={Position.Left}
      />

      <StandardHandle id="in" type="target" className="z-10" />
      <StandardHandle id="out" type="source" className="z-10" />
    </>
  )
}

export const WhileNode = memo(WhileNodeComponent)
