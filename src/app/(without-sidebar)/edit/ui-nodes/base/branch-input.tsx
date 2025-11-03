import { StandardHandle } from './standard-handle'

interface BranchInputProps {
  index: number
  totalCount: number
  label: string
  portId: string
}

export function BranchInput({
  index,
  totalCount,
  label,
  portId,
}: BranchInputProps) {
  // Calculate offset relative to the visual middle of the entire branch list.
  // - Rows above middle: push handle DOWN (toward center)
  // - Rows below middle: pull handle UP (toward center)
  // - Middle row: 0 offset (stays at center)
  // This creates a subtle "converging" visual effect where all handles lean toward the center.

  const rowHeight = 28

  const middleIndex = (totalCount - 1) / 2
  const distanceFromMiddle = Math.abs(index - middleIndex)
  const direction = index < middleIndex ? 1 : index > middleIndex ? -1 : 0

  // Calculate offset based on:
  // 1. Distance from middle (farther = more offset)
  // 2. Total count (more branches = slightly stronger effect)
  // 3. Ensure handle stays within its branch-input bounds (max ~35% of rowHeight)

  // Subtle base offset that scales gently with totalCount
  const baseOffsetPerStep = Math.min(8 + totalCount * 2, 20) // 8-8px per step
  const rawOffsetPx = distanceFromMiddle * baseOffsetPerStep

  // Maximum offset is ~15% of row height to ensure handle stays comfortably visible
  const maxOffsetPx = rowHeight * 0.15
  const offsetPx = Math.min(rawOffsetPx, maxOffsetPx) * direction

  return (
    <div className="relative flex items-center justify-end max-w-[400px] gap-2 px-2 -mr-2 min-w-0 rounded-[10px] bg-muted/80">
      <span className="text-xs text-muted-foreground h-7 leading-7 truncate">
        {label}
      </span>
      {/* Handle wrapper: positioned absolutely at right edge, with calculated vertical offset */}
      <div
        className="absolute top-1/2 -right-2 size-3 translate-x-1/9"
        style={{
          transform: `translateY(calc(-50% + ${offsetPx}px))`,
        }}
      >
        <StandardHandle id={portId} type="source" />
      </div>
    </div>
  )
}
