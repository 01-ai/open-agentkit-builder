import { Node } from '@xyflow/react'

/**
 * Collision Detection Engine
 * AABB (Axis-Aligned Bounding Box) Collision Detection + Minimal Displacement Resolution
 */

// Check if two rectangles overlap
export const checkOverlap = (
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
) => {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect1.x > rect2.x + rect2.width ||
    rect1.y + rect1.height < rect2.y ||
    rect1.y > rect2.y + rect2.height
  )
}

interface NodeInfo {
  id: string
  width: number
  height: number
  isNew: boolean
}

/**
 * Push away overlapping nodes using AABB collision detection
 * @param startNodeId - ID of the new node being added
 * @param startX - X position of the new node
 * @param startY - Y position of the new node
 * @param startWidth - Width of the new node
 * @param startHeight - Height of the new node
 * @param getNodes - Function to get all existing nodes
 * @param triggerNodeId - The node that triggered the collision (should not move)
 * @returns Map of node IDs to their new positions
 */
export const pushAwayOverlappingNodes = (
  startNodeId: string,
  startX: number,
  startY: number,
  startWidth: number,
  startHeight: number,
  getNodes: () => Node[],
  triggerNodeId?: string // The node that triggered the collision (should not move)
): Map<string, { x: number; y: number }> => {
  const padding = 8 // Reduced from 15 to 8 for tighter spacing
  const positions = new Map<string, { x: number; y: number }>()

  // Initialize: all existing nodes keep their positions
  const allNodes = getNodes()
  // Exclude the startNodeId from allNodes to avoid self-collision
  // Include While nodes in collision detection - they should be pushed away when adding new nodes
  const existingNodes = allNodes.filter((node) => node.id !== startNodeId)

  for (const node of existingNodes) {
    positions.set(node.id, { ...node.position })
  }

  // New/dragged node fixed at target position
  positions.set(startNodeId, { x: startX, y: startY })

  const nodeInfos: NodeInfo[] = [
    ...existingNodes.map((n) => ({
      id: n.id,
      width: Number(n.style?.width || n.measured?.width || n.width || 180),
      height: Number(n.style?.height || n.measured?.height || n.height || 80),
      isNew: false,
    })),
    {
      id: startNodeId,
      width: startWidth,
      height: startHeight,
      isNew: true,
    },
  ]

  // Helper: get AABB for a node
  const getAABB = (nodeId: string, nodeWidth: number, nodeHeight: number) => {
    const pos = positions.get(nodeId)!
    return {
      left: pos.x - padding,
      right: pos.x + nodeWidth + padding,
      top: pos.y - padding,
      bottom: pos.y + nodeHeight + padding,
      centerX: pos.x + nodeWidth / 2,
      centerY: pos.y + nodeHeight / 2,
    }
  }

  // Helper: check AABB overlap
  const checkAABBOverlap = (
    a: ReturnType<typeof getAABB>,
    b: ReturnType<typeof getAABB>
  ) => {
    return !(
      a.right <= b.left ||
      a.left >= b.right ||
      a.bottom <= b.top ||
      a.top >= b.bottom
    )
  }

  // Multi-round iteration
  const maxRounds = 20
  let round = 0

  for (round = 0; round < maxRounds; round++) {
    const displacements = new Map<string, { dx: number; dy: number }>()
    let hasCollision = false

    // Check all node pairs
    for (let i = 0; i < nodeInfos.length; i++) {
      for (let j = i + 1; j < nodeInfos.length; j++) {
        const nodeA = nodeInfos[i]
        const nodeB = nodeInfos[j]

        const aabbA = getAABB(nodeA.id, nodeA.width, nodeA.height)
        const aabbB = getAABB(nodeB.id, nodeB.width, nodeB.height)

        if (checkAABBOverlap(aabbA, aabbB)) {
          hasCollision = true

          // Calculate penetration depth
          const overlapX =
            Math.min(aabbA.right, aabbB.right) -
            Math.max(aabbA.left, aabbB.left)
          const overlapY =
            Math.min(aabbA.bottom, aabbB.bottom) -
            Math.max(aabbA.top, aabbB.top)

          // Determine separation axis (choose minimum penetration)
          let separationAxis: 'horizontal' | 'vertical'
          let separation: number

          if (overlapX < overlapY) {
            separationAxis = 'horizontal'
            separation = overlapX
          } else {
            separationAxis = 'vertical'
            separation = overlapY
          }

          // Calculate displacement for each node
          // New node or trigger node is fixed, only move other nodes
          let targetNode: NodeInfo
          let direction: number // -1 or +1

          // Check if either node is the trigger node (should not move)
          const nodeAIsTrigger = triggerNodeId && nodeA.id === triggerNodeId
          const nodeBIsTrigger = triggerNodeId && nodeB.id === triggerNodeId

          if (nodeA.isNew || nodeAIsTrigger) {
            // Move B away from A (A is new or trigger node)
            targetNode = nodeB
            if (separationAxis === 'horizontal') {
              direction = aabbB.centerX > aabbA.centerX ? 1 : -1
            } else {
              direction = aabbB.centerY > aabbA.centerY ? 1 : -1
            }
          } else if (nodeB.isNew || nodeBIsTrigger) {
            // Move A away from B (B is new or trigger node)
            targetNode = nodeA
            if (separationAxis === 'horizontal') {
              direction = aabbA.centerX > aabbB.centerX ? 1 : -1
            } else {
              direction = aabbA.centerY > aabbB.centerY ? 1 : -1
            }
          } else {
            // Both are existing nodes, move the one further from new node
            const newPos = positions.get(startNodeId)!
            const distA = Math.hypot(
              aabbA.centerX - newPos.x,
              aabbA.centerY - newPos.y
            )
            const distB = Math.hypot(
              aabbB.centerX - newPos.x,
              aabbB.centerY - newPos.y
            )

            if (distA > distB) {
              targetNode = nodeA
              if (separationAxis === 'horizontal') {
                direction = aabbA.centerX > aabbB.centerX ? 1 : -1
              } else {
                direction = aabbA.centerY > aabbB.centerY ? 1 : -1
              }
            } else {
              targetNode = nodeB
              if (separationAxis === 'horizontal') {
                direction = aabbB.centerX > aabbA.centerX ? 1 : -1
              } else {
                direction = aabbB.centerY > aabbA.centerY ? 1 : -1
              }
            }
          }

          // Accumulate displacement
          const current = displacements.get(targetNode.id) || { dx: 0, dy: 0 }
          if (separationAxis === 'horizontal') {
            current.dx += direction * (separation + 5) // +5 for extra margin
          } else {
            current.dy += direction * (separation + 5)
          }
          displacements.set(targetNode.id, current)
        }
      }
    }

    if (!hasCollision) {
      break
    }

    // Apply all displacements at once
    for (const [nodeId, displacement] of displacements) {
      const currentPos = positions.get(nodeId)!
      positions.set(nodeId, {
        x: currentPos.x + displacement.dx,
        y: currentPos.y + displacement.dy,
      })
    }
  }

  // Remove temporary new node from result
  positions.delete(startNodeId)

  return positions
}

/**
 * Check if a position would overlap with existing nodes
 */
export const checkPositionOverlap = (
  x: number,
  y: number,
  width = 180,
  height = 80,
  getNodes: () => Node[],
  excludeId?: string
): boolean => {
  const existingNodes = getNodes()
  const padding = 15

  const newRect = {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  }

  return existingNodes.some((node) => {
    if (excludeId && node.id === excludeId) return false
    // Include While nodes in collision detection - they should be pushed away when adding new nodes

    const nodeWidth = Number(
      node.style?.width || node.measured?.width || node.width || 180
    )
    const nodeHeight = Number(
      node.style?.height || node.measured?.height || node.height || 80
    )
    const nodeRect = {
      x: node.position.x - padding,
      y: node.position.y - padding,
      width: nodeWidth + padding * 2,
      height: nodeHeight + padding * 2,
    }
    return checkOverlap(newRect, nodeRect)
  })
}
