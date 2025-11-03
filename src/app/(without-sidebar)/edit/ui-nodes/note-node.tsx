import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { NodeProps, NodeResizer, useReactFlow } from '@xyflow/react'
import { memo } from 'react'
import { useHover } from 'react-use'

/**
 * Note Node Data Interface
 * Matches OpenAI AgentBuilder format:
 * - text: Note content
 * - name: Optional name (always null in OpenAI examples)
 * - userDefinedPassthroughVariables: Always empty array
 */
export interface NoteNodeData {
  text: string
  name: null
  userDefinedPassthroughVariables: never[]
}

const NoteNodeComponent = ({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow()

  const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = evt.target.value
    updateNodeData(id, { text: newText })
  }

  const [hoverable, hovered] = useHover(() => (
    <div
      className={cn(
        'w-full h-full rounded-2xl !border-2 py-2 pl-2 pr-0',
        '!border-[color:color-mix(in_oklch,var(--color-black)_20%,var(--color-yellow-300)_50%)]',
        'bg-[color:color-mix(in_oklch,var(--color-yellow-300)_50%,white)]'
      )}
      tabIndex={0}
    >
      <Textarea
        className="w-full h-full min-h-0 !rounded-none resize-none !ring-0 !border-none !shadow-none p-0 !text-xs overflow-y-auto"
        value={(data as unknown as NoteNodeData).text || ''}
        onChange={onChange}
        placeholder="Write a note..."
      />
    </div>
  ))

  return (
    <>
      {hoverable}
      <NodeResizer
        isVisible={true}
        minWidth={50}
        minHeight={40}
        handleClassName={cn(
          '!size-[5px] !border-px opacity-0 !bg-primary/40 transition-opacity transition-opacity duration-700',
          hovered && 'opacity-100'
        )}
        lineClassName="!border-transparent"
      />
    </>
  )
}

export const NoteNode = memo(NoteNodeComponent)
