import { nodeRegistry } from '@/lib/nodes/registry'
import { Node, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { pushAwayOverlappingNodes } from './collision-engine'
import { NodeConfig } from './node-palette'

/**
 * Custom hook for node operations
 * Handles adding, removing, and moving nodes
 */
export function useNodeOperations(
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>,
  getNodes?: () => Node[],
  setNodesState?: React.Dispatch<React.SetStateAction<Node[]>>,
  onChange?: () => void,
  collisionDetection?: boolean
) {
  const {
    screenToFlowPosition,
    getNodes: getNodesFlow,
    setNodes: setNodesFlow,
  } = useReactFlow()

  // Use provided getters/setters if available, otherwise use React Flow's
  const getNodesInternal = getNodes || getNodesFlow
  const setNodesInternal = setNodesState || setNodesFlow

  // Generate unique node ID
  const getNodeId = useCallback(() => {
    return `node_${Date.now()}_${Math.random()}`
  }, [])

  // Add node at specific position (for drag & drop)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      const label = event.dataTransfer.getData('application/reactflow-label')

      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Get node definition to create proper config
      const definition = nodeRegistry.get(type)

      // Special handling for note nodes
      const isNoteNode = type === 'note'
      const isWhileNode = type === 'while'

      const newNode: Node = {
        id: getNodeId(),
        type: type,
        position: position,
        data: isNoteNode
          ? {
              text: '',
              name: null,
              userDefinedPassthroughVariables: [],
            }
          : {
              label,
              subtitle: label,
              nodeType: definition?.nodeType || `builtins.${type}`,
              config: definition?.getDefaultConfig() || {},
              inputSchema: definition?.getInputSchema?.() || undefined,
            },
      }

      // Set initial dimensions for resizable nodes
      if (isNoteNode) {
        newNode.style = {
          width: 130,
          height: 60,
        }
      } else if (isWhileNode) {
        newNode.style = {
          width: 200,
          height: 150,
        }
      }

      // Check if drop position is inside any While node
      // For new nodes from sidebar, just check if mouse position is inside
      const allNodes = getNodesInternal()
      const whileNodes = allNodes.filter((n) => n.type === 'while')

      for (const whileNode of whileNodes) {
        const whileWidth = Number(
          whileNode.style?.width || whileNode.measured?.width || 200
        )
        const whileHeight = Number(
          whileNode.style?.height || whileNode.measured?.height || 150
        )

        // Check if drop position (mouse position) is inside While node
        if (
          position.x >= whileNode.position.x &&
          position.y >= whileNode.position.y &&
          position.x <= whileNode.position.x + whileWidth &&
          position.y <= whileNode.position.y + whileHeight
        ) {
          // Set this While node as parent and adjust position to relative coordinates
          newNode.parentId = whileNode.id
          newNode.position = {
            x: position.x - whileNode.position.x,
            y: position.y - whileNode.position.y,
          }
          break
        }
      }

      if (collisionDetection) {
        const tempPositions = pushAwayOverlappingNodes(
          newNode.id,
          newNode.position.x,
          newNode.position.y,
          Number(newNode.style?.width || 180),
          Number(newNode.style?.height || 80),
          () => allNodes,
          newNode.id // New node is the trigger, should not move
        )

        // Batch update: push existing nodes AND add new node in one operation
        setNodesInternal((nds) => {
          const updatedNodes = nds.map((n) => {
            const newPos = tempPositions.get(n.id)
            return newPos ? { ...n, position: newPos } : n
          })
          return [...updatedNodes, newNode]
        })
      } else {
        setNodesInternal((nds) => [...nds, newNode])
      }

      onChange?.()
    },
    [
      screenToFlowPosition,
      setNodesInternal,
      getNodesInternal,
      getNodeId,
      onChange,
      collisionDetection,
    ]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle existing node drag stop (check for collisions and push away overlapping nodes)
  const onNodeDragStop = useCallback(
    (
      event: React.MouseEvent,
      node: Node,
      onParentUpdate?: (draggedNode: Node) => string | undefined,
      onAutoResize?: (
        parentId: string,
        onCollisionCheck?: () => void,
        shouldTriggerCollision?: boolean
      ) => void
    ) => {
      if (onParentUpdate) {
        onParentUpdate(node)
      }

      if (collisionDetection) {
        setTimeout(() => {
          const currentNodes = getNodesInternal()
          const updatedNode = currentNodes.find((n) => n.id === node.id)

          if (!updatedNode) {
            return
          }

          if (updatedNode.parentId) {
            const parentNode = currentNodes.find(
              (n) => n.id === updatedNode.parentId
            )
            if (!parentNode) return

            const siblings = currentNodes.filter(
              (n) => n.parentId === updatedNode.parentId && n.id !== updatedNode.id
            )

            const absoluteSiblings = siblings.map((sibling) => ({
              ...sibling,
              position: {
                x: sibling.position.x + parentNode.position.x,
                y: sibling.position.y + parentNode.position.y,
              },
            }))

            const absoluteUpdatedNode = {
              ...updatedNode,
              position: {
                x: updatedNode.position.x + parentNode.position.x,
                y: updatedNode.position.y + parentNode.position.y,
              },
            }

            const tempPositions = pushAwayOverlappingNodes(
              absoluteUpdatedNode.id,
              absoluteUpdatedNode.position.x,
              absoluteUpdatedNode.position.y,
              Number(absoluteUpdatedNode.measured?.width || 180),
              Number(absoluteUpdatedNode.measured?.height || 80),
              () => [absoluteUpdatedNode, ...absoluteSiblings],
              absoluteUpdatedNode.id // The dragged node is the trigger
            )

            if (tempPositions.size > 0) {
              setNodesInternal((nds) =>
                nds.map((n) => {
                  const newPos = tempPositions.get(n.id)
                  if (newPos && n.parentId === updatedNode.parentId) {
                    return {
                      ...n,
                      position: {
                        x: newPos.x - parentNode.position.x,
                        y: newPos.y - parentNode.position.y,
                      },
                    }
                  }
                  return n
                })
              )

              if (onAutoResize && updatedNode.parentId) {
                setTimeout(() => {
                  onAutoResize(updatedNode.parentId as string, undefined, true)
                }, 50)
              }
            }
          } else {
            const topLevelNodes = currentNodes.filter(
              (n) => !n.parentId && n.id !== updatedNode.id
            )

            const tempPositions = pushAwayOverlappingNodes(
              updatedNode.id,
              updatedNode.position.x,
              updatedNode.position.y,
              Number(updatedNode.measured?.width || 180),
              Number(updatedNode.measured?.height || 80),
              () => topLevelNodes,
              updatedNode.id // The dragged node is the trigger
            )

            if (tempPositions.size > 0) {
              setNodesInternal((nds) =>
                nds.map((n) => {
                  const newPos = tempPositions.get(n.id)
                  return newPos ? { ...n, position: newPos } : n
                })
              )
            }
          }

          onChange?.()
        }, 0)
      }
    },
    [getNodesInternal, setNodesInternal, onChange, collisionDetection]
  )

  // Add node at center (for click)
  const addNodeAtCenter = useCallback(
    (nodeConfig: NodeConfig) => {
      // Get the center of the viewport
      const bounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!bounds) {
        return
      }

      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2

      const position = screenToFlowPosition({
        x: centerX,
        y: centerY,
      })

      // Get node definition to create proper config
      const definition = nodeRegistry.get(nodeConfig.type)

      // Special handling for note nodes
      const isNoteNode = nodeConfig.type === 'note'
      const isWhileNode = nodeConfig.type === 'while'

      // Create new node
      const newNode: Node = {
        id: getNodeId(),
        type: nodeConfig.type,
        position: position,
        data: isNoteNode
          ? {
              text: 'Sticky note', // default value
              name: null,
              userDefinedPassthroughVariables: [],
            }
          : {
              label: nodeConfig.label,
              subtitle: nodeConfig.label,
              nodeType: definition?.nodeType || `builtins.${nodeConfig.type}`,
              config: definition?.getDefaultConfig() || {},
              inputSchema: definition?.getInputSchema?.() || undefined,
            },
      }

      // Set initial dimensions for resizable nodes
      if (isNoteNode) {
        newNode.style = {
          width: 130,
          height: 60,
        }
      } else if (isWhileNode) {
        newNode.style = {
          width: 200,
          height: 150,
        }
      }

      if (collisionDetection) {
        const allNodes = getNodesInternal()
        const tempPositions = pushAwayOverlappingNodes(
          newNode.id,
          position.x,
          position.y,
          Number(newNode.style?.width || 180),
          Number(newNode.style?.height || 80),
          () => allNodes,
          newNode.id // New node is the trigger
        )

        // Batch update: push existing nodes AND add new node in one operation
        setNodesInternal((nds) => {
          const updatedNodes = nds.map((n) => {
            const newPos = tempPositions.get(n.id)
            return newPos ? { ...n, position: newPos } : n
          })
          return [...updatedNodes, newNode]
        })
      } else {
        setNodesInternal((nds) => [...nds, newNode])
      }

      onChange?.()
    },
    [
      screenToFlowPosition,
      setNodesInternal,
      getNodesInternal,
      getNodeId,
      reactFlowWrapper,
      onChange,
      collisionDetection,
    ]
  )

  return {
    onDrop,
    onDragOver,
    onNodeDragStop,
    addNodeAtCenter,
  }
}
