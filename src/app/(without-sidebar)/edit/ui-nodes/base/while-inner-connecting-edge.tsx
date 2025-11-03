import {
  BaseEdge,
  type EdgeProps,
  getBezierPath,
  Position,
} from '@xyflow/react'
export default function WhileInnerConnectingEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourceHandleId } = props

  const isSourceParent = sourceHandleId === 'dummy-in'

  const [path] = getBezierPath({
    sourceX: isSourceParent ? sourceX + 8 : sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX: isSourceParent ? targetX : targetX - 8,
    targetY,
    targetPosition: Position.Left,
  })
  return <BaseEdge path={path} />
}
