import { Node, useReactFlow, addEdge } from '@xyflow/react'
import { useCallback } from 'react'
import { getTargetHandle, getSourceHandles } from '@/lib/nodes/node-handles'

/**
 * Hook for managing parent-child node relationships
 * Handles drag-to-parent, auto-connection, and auto-resize for While nodes
 */
export function useParentNode() {
  const { getNodes, setNodes, setEdges } = useReactFlow()

  /**
   * Check if a node is completely inside a potential parent node (for absolute coordinates)
   */
  const isNodeCompletelyInside = useCallback(
    (node: Node, parentNode: Node): boolean => {
      // Get node dimensions (use measured first, then style, then defaults)
      const nodeWidth = Number(
        node.measured?.width || node.style?.width || 180
      )
      const nodeHeight = Number(
        node.measured?.height || node.style?.height || 80
      )

      // Get parent's actual dimensions (use style first, then measured, then defaults)
      const parentWidth = Number(
        parentNode.style?.width || parentNode.measured?.width || 200
      )
      const parentHeight = Number(
        parentNode.style?.height || parentNode.measured?.height || 150
      )

      // If node is a child of parentNode, its position is relative to parent
      // If node is not a child, we need to convert its absolute position to relative
      let nodeX = node.position.x
      let nodeY = node.position.y

      // If the node is not currently a child of this parent, convert absolute to relative coordinates
      if (node.parentId !== parentNode.id) {
        nodeX = node.position.x - parentNode.position.x
        nodeY = node.position.y - parentNode.position.y
      }

      // Now check if node is within parent bounds (using relative coordinates)
      const nodeRight = nodeX + nodeWidth
      const nodeBottom = nodeY + nodeHeight

      // Add tolerance for boundary checking to account for rendering precision
      // Use 15px tolerance for better stability during drag operations with multiple children
      // This accounts for:
      // - Subpixel rendering differences
      // - Dimension measurement delays during rapid drag events
      // - While node auto-resize timing issues
      const tolerance = 15
      const isInside =
        nodeX >= -tolerance &&
        nodeY >= -tolerance &&
        nodeRight <= parentWidth + tolerance &&
        nodeBottom <= parentHeight + tolerance

      return isInside
    },
    []
  )

  /**
   * Update parent-child relationships based on node positions
   * Called when a node is dragged
   * Returns the new parent ID (or undefined if no parent)
   * When a node enters a While parent, disconnects all its edges
   */
  const updateParentOnDrag = useCallback(
    (draggedNode: Node): string | undefined => {
      const currentNodes = getNodes()

      // Get the latest version of the dragged node from the current state
      const currentDraggedNode = currentNodes.find((n) => n.id === draggedNode.id)
      if (!currentDraggedNode) {
        return draggedNode.parentId
      }

      const oldParentId = currentDraggedNode.parentId
      let newParentId: string | undefined = oldParentId

      // If node already has a parent, check if it's still inside
      if (oldParentId) {
        const oldParent = currentNodes.find((n) => n.id === oldParentId)
        if (oldParent) {
          // For child nodes, position is relative, so check directly
          const isStillInside = isNodeCompletelyInside(currentDraggedNode, oldParent)

          if (!isStillInside) {
            newParentId = undefined
          }
        }
      } else {
        // Node doesn't have a parent, check if it moved into a While node
        const whileNodes = currentNodes.filter(
          (n) => n.type === 'while' && n.id !== currentDraggedNode.id
        )

        // Check if node is completely inside any While node
        for (const whileNode of whileNodes) {
          if (isNodeCompletelyInside(currentDraggedNode, whileNode)) {
            newParentId = whileNode.id
            break
          }
        }
      }

      // Only update if parent actually changed
      if (newParentId !== oldParentId) {
        // Build updated nodes array with all changes
        let updatedNodes = currentNodes.map((n) => {
          if (n.id === currentDraggedNode.id) {
            const updatedNode = { ...n }
            if (newParentId) {
              const newParent = currentNodes.find((p) => p.id === newParentId)
              if (newParent) {
                updatedNode.parentId = newParentId
                // If dragging from external to While, convert to relative coordinates
                if (!oldParentId) {
                  updatedNode.position = {
                    x: currentDraggedNode.position.x - newParent.position.x,
                    y: currentDraggedNode.position.y - newParent.position.y,
                  }
                }
                // If already inside While, position is already relative, keep it
              }
            } else {
              // Dragging out of While
              const oldParent = currentNodes.find((p) => p.id === oldParentId)
              if (oldParent) {
                // Convert from relative to absolute coordinates
                updatedNode.position = {
                  x: currentDraggedNode.position.x + oldParent.position.x,
                  y: currentDraggedNode.position.y + oldParent.position.y,
                }
              }
              delete updatedNode.parentId
            }
            return updatedNode
          }
          return n
        })

        // Handle moving into a While node (first child auto-connect)
        if (newParentId && !oldParentId) {
          const newParent = updatedNodes.find((n) => n.id === newParentId)
          if (newParent?.type === 'while') {
            const childNodes = updatedNodes.filter((n) => n.parentId === newParentId)
            // Only if this is the first child
            if (childNodes.length === 1) {
              // Update While node's start_node_id
              updatedNodes = updatedNodes.map((n) => {
                if (n.id === newParentId) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      config: {
                        ...n.data.config,
                        body: {
                          ...n.data.config?.body,
                          start_node_id: currentDraggedNode.id,
                        },
                      },
                    },
                  }
                }
                return n
              })
            }
          }
        }

        // Handle moving out of a While node (update start_node_id)
        if (oldParentId && !newParentId) {
          const oldParent = updatedNodes.find((n) => n.id === oldParentId && n.type === 'while')
          if (oldParent) {
            const startNodeId = oldParent.data.config?.body?.start_node_id
            // If the removed node was the start node, update it
            if (startNodeId === currentDraggedNode.id) {
              const remainingChildren = updatedNodes.filter(
                (n) => n.parentId === oldParentId && n.id !== currentDraggedNode.id
              )
              updatedNodes = updatedNodes.map((n) => {
                if (n.id === oldParentId) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      config: {
                        ...n.data.config,
                        body: {
                          ...n.data.config?.body,
                          start_node_id:
                            remainingChildren.length > 0
                              ? remainingChildren[0].id
                              : undefined,
                        },
                      },
                    },
                  }
                }
                return n
              })
            }
          }
        }

        // Update nodes first
        setNodes(updatedNodes)

        // Disconnect all edges connected to this node when moving in/out of parent
        setEdges((eds) =>
          eds.filter((edge) => {
            const shouldRemove =
              edge.source === currentDraggedNode.id || edge.target === currentDraggedNode.id
            return !shouldRemove
          })
        )

        // Auto-connect first child to While node when it enters
        if (newParentId && !oldParentId) {
          const newParent = updatedNodes.find((n) => n.id === newParentId)
          // Check if this is the first child of a While node
          if (newParent?.type === 'while') {
            const childNodes = updatedNodes.filter(
              (n) => n.parentId === newParentId
            )
            if (childNodes.length === 1) {
              // Get the target handle for the child node
              const targetHandle = getTargetHandle(currentDraggedNode.type)
              // Get all source handles for the child node
              const sourceHandles = getSourceHandles(currentDraggedNode.type, currentDraggedNode.data?.config)

              setEdges((eds) => {
                let newEdges = eds

                // Add dummy-in edge (only when While is empty and first node is added)
                const dummyInEdge = {
                  id: `${newParentId}-dummy-in-${currentDraggedNode.id}`,
                  source: newParentId,
                  sourceHandle: 'dummy-in',
                  target: currentDraggedNode.id,
                  targetHandle: targetHandle || 'in',
                  type: 'while-inner-connecting',
                }

                // Add in edge
                const inEdge = {
                  id: `${newParentId}-in-${currentDraggedNode.id}`,
                  source: newParentId,
                  sourceHandle: 'in',
                  target: currentDraggedNode.id,
                  targetHandle: targetHandle || 'in',
                }

                newEdges = addEdge(dummyInEdge, newEdges)
                newEdges = addEdge(inEdge, newEdges)

                // Add out edges for each source handle
                sourceHandles.forEach((sourceHandle) => {
                  const outEdge = {
                    id: `${currentDraggedNode.id}-${sourceHandle}-${newParentId}`,
                    source: currentDraggedNode.id,
                    sourceHandle: sourceHandle,
                    target: newParentId,
                    targetHandle: 'out',
                    type: 'while-inner-connecting',
                  }
                  newEdges = addEdge(outEdge, newEdges)
                })

                return newEdges
              })
            }
          }
        }
      }

      return newParentId
    },
    [getNodes, setNodes, setEdges, isNodeCompletelyInside]
  )

  /**
   * Auto-resize While node to fit all children
   * Only resize if children are outside the current bounds
   * After resize, trigger collision detection with other nodes
   */
  const autoResizeWhileNode = useCallback(
    (
      whileNodeId: string,
      onCollisionCheck?: () => void,
      shouldTriggerCollision = true
    ) => {
      const nodes = getNodes()
      const whileNode = nodes.find((n) => n.id === whileNodeId)
      if (!whileNode) return

      // Find all children
      const children = nodes.filter((n) => n.parentId === whileNodeId)
      if (children.length === 0) return

      // Get current dimensions
      const currentWidth = Number(
        whileNode.measured?.width || whileNode.style?.width || 200
      )
      const currentHeight = Number(
        whileNode.measured?.height || whileNode.style?.height || 150
      )

      // Calculate bounding box of all children (in relative coordinates)
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      children.forEach((child) => {
        const childWidth = Number(child.measured?.width || 180)
        const childHeight = Number(child.measured?.height || 80)

        minX = Math.min(minX, child.position.x)
        minY = Math.min(minY, child.position.y)
        maxX = Math.max(maxX, child.position.x + childWidth)
        maxY = Math.max(maxY, child.position.y + childHeight)
      })

      // Add padding
      const padding = 20
      const headerHeight = 40

      // Calculate required dimensions
      const requiredWidth = maxX + padding
      const requiredHeight = maxY + padding + headerHeight

      // Only resize if children are outside current bounds or if nodes are near edges
      const needsResize =
        requiredWidth > currentWidth ||
        requiredHeight > currentHeight ||
        minX < padding || // Children too close to left edge
        minY < headerHeight + padding // Children too close to top edge

      if (!needsResize) {
        return
      }

      // Calculate new dimensions (ensure minimum size)
      const minWidth = 200
      const minHeight = 150
      const newWidth = Math.max(requiredWidth, currentWidth, minWidth)
      const newHeight = Math.max(requiredHeight, currentHeight, minHeight)

      // Update While node dimensions
      setNodes((nds) => {
        const updatedNodes = nds.map((n) => {
          if (n.id === whileNodeId) {
            return {
              ...n,
              style: {
                ...n.style,
                width: newWidth,
                height: newHeight,
              },
            }
          }
          return n
        })

        // After updating the While node, trigger collision detection only if requested
        if (onCollisionCheck && shouldTriggerCollision) {
          setTimeout(() => {
            onCollisionCheck()
          }, 0)
        }

        return updatedNodes
      })
    },
    [getNodes, setNodes]
  )

  return {
    updateParentOnDrag,
    autoResizeWhileNode,
  }
}