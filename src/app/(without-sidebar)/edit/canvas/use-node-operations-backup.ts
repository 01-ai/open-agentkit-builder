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
  onChange?: () => void
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

      console.log('=== DROP EVENT ===')
      console.log('Drop at position:', position)

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

      console.log(
        'CREATE_NODE:',
        JSON.stringify({
          id: newNode.id,
          type: newNode.type,
          pos: newNode.position,
        })
      )

      // Use AABB collision detection to push away overlapping nodes
      const tempPositions = pushAwayOverlappingNodes(
        newNode.id,
        position.x,
        position.y,
        180,
        80,
        getNodesInternal
      )

      console.log(`Pushed ${tempPositions.size} nodes after drop`)

      // Batch update: push existing nodes AND add new node in one operation
      setNodesInternal((nds) => {
        const updatedNodes = nds.map((n) => {
          const newPos = tempPositions.get(n.id)
          return newPos ? { ...n, position: newPos } : n
        })
        return [...updatedNodes, newNode]
      })

      console.log('✅ Node added successfully via drag & drop')
      onChange?.()
    },
    [
      screenToFlowPosition,
      setNodesInternal,
      getNodesInternal,
      getNodeId,
      onChange,
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
      onParentUpdate?: (node: Node) => string | undefined,
      onAutoResize?: (parentId: string, onCollisionCheck?: () => void) => void
    ) => {
      console.log('=== NODE DRAG STOP ===')
      console.log('Node dropped at position:', node.position)
      console.log('Current parentId:', node.parentId)

      // First check if this is already a child node
      const isChildNode = node.parentId !== undefined

      // Call parent update callback if provided (for While node parent-child management)
      // This may change the parentId and returns the new parent ID
      let finalParentId: string | undefined = undefined
      if (onParentUpdate) {
        finalParentId = onParentUpdate(node)
        onChange?.()
        // Still need to check for collisions even after parent update
      }

      // After parent update, trigger auto-resize if needed
      if (onAutoResize && finalParentId) {
        // Defer resize to ensure parent-child relationship is fully established
        setTimeout(() => onAutoResize(finalParentId), 100)
      }

      console.log('Final parentId after update:', finalParentId)

      // For child nodes, check collisions only with siblings (same parent)
      if (finalParentId) {
        console.log('Child node - checking collisions with siblings only')

        // Get the current nodes after parent update
        // Note: We need to wait a bit for React state to update
        setTimeout(() => {
          const currentNodes = getNodesInternal()
          const updatedNode = currentNodes.find((n) => n.id === node.id)

          // Get all sibling nodes (nodes with same parent)
          const siblings = currentNodes.filter(
            (n) => n.parentId === finalParentId && n.id !== node.id
          )

          if (siblings.length > 0) {
            // For child nodes, use relative coordinates for collision detection
            const parent = currentNodes.find((n) => n.id === finalParentId)
            if (parent && updatedNode) {
              console.log(
                'Checking collisions with siblings at relative position:',
                updatedNode.position
              )

              // Check collisions with siblings using relative coordinates
              const tempPositions = pushAwayOverlappingNodes(
                updatedNode.id,
                updatedNode.position.x,
                updatedNode.position.y,
                Number(updatedNode.measured?.width || 180),
                Number(updatedNode.measured?.height || 80),
                () => siblings
              )

              if (tempPositions.size > 0) {
                console.log(`Pushed ${tempPositions.size} sibling nodes`)

                // Update sibling positions (already in relative coordinates)
                setNodesInternal((nds) =>
                  nds.map((n) => {
                    const newPos = tempPositions.get(n.id)
                    if (newPos) {
                      return {
                        ...n,
                        position: newPos,
                      }
                    }
                    return n
                  })
                )

                // Auto-resize parent after collision
                if (onAutoResize) {
                  setTimeout(() => {
                    // Create a collision check callback that will be called after resize
                    const collisionCheckCallback = () => {
                      console.log('Checking collisions after While node resize')
                      // Get the updated While node and check for collisions with other nodes
                      const currentNodes = getNodesInternal()
                      const resizedWhileNode = currentNodes.find(
                        (n) => n.id === finalParentId
                      )
                      if (resizedWhileNode) {
                        // Use collision detection to push away overlapping nodes
                        const tempPositions = pushAwayOverlappingNodes(
                          resizedWhileNode.id,
                          resizedWhileNode.position.x,
                          resizedWhileNode.position.y,
                          Number(
                            resizedWhileNode.style?.width ||
                              resizedWhileNode.measured?.width ||
                              200
                          ),
                          Number(
                            resizedWhileNode.style?.height ||
                              resizedWhileNode.measured?.height ||
                              150
                          ),
                          getNodesInternal
                        )

                        if (tempPositions.size > 0) {
                          console.log(
                            `Pushed ${tempPositions.size} nodes after While node resize`
                          )
                          setNodesInternal((nds) =>
                            nds.map((n) => {
                              const newPos = tempPositions.get(n.id)
                              return newPos ? { ...n, position: newPos } : n
                            })
                          )
                        }
                      }
                    }

                    onAutoResize(finalParentId, collisionCheckCallback)
                  }, 50)
                }
              }
            }
          }

          onChange?.()
        }, 0) // End of setTimeout for collision detection
        return
      }

      // Check if this node just moved out of a parent
      const hadParentBefore = node.parentId !== undefined
      const hasParentNow = finalParentId !== undefined

      if (hadParentBefore && !hasParentNow) {
        console.log(
          'Node moved out of parent - checking collisions with all top-level nodes'
        )

        // Use AABB collision detection to push away overlapping nodes
        const tempPositions = pushAwayOverlappingNodes(
          node.id,
          node.position.x,
          node.position.y,
          180,
          80,
          getNodesInternal
        )

        // If any nodes were pushed, update all positions
        if (tempPositions.size > 0) {
          console.log(
            `Pushed ${tempPositions.size} nodes after moving out of parent`
          )

          setNodesInternal((nds) =>
            nds.map((n) => {
              const newPos = tempPositions.get(n.id)
              return newPos ? { ...n, position: newPos } : n
            })
          )
        } else {
          console.log('No collision detected after moving out of parent')
        }
        return
      }

      // For top-level nodes, use normal collision detection
      console.log(
        'Top-level node - checking collisions with all top-level nodes'
      )

      // Use AABB collision detection to push away overlapping nodes
      const tempPositions = pushAwayOverlappingNodes(
        node.id,
        node.position.x,
        node.position.y,
        180,
        80,
        getNodesInternal
      )

      // If any nodes were pushed, update all positions
      if (tempPositions.size > 0) {
        console.log(
          `Pushed ${tempPositions.size} nodes after dragging node ${node.id}`
        )

        setNodesInternal((nds) =>
          nds.map((n) => {
            const newPos = tempPositions.get(n.id)
            return newPos ? { ...n, position: newPos } : n
          })
        )
      } else {
        console.log('No collision detected, no nodes to push')
      }
    },
    [getNodesInternal, setNodesInternal]
  )

  // Add node at center (for click)
  const addNodeAtCenter = useCallback(
    (nodeConfig: NodeConfig) => {
      // Get the center of the viewport
      const bounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!bounds) {
        console.log('No bounds found for reactFlowWrapper')
        return
      }

      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2

      const position = screenToFlowPosition({
        x: centerX,
        y: centerY,
      })

      console.log('=== CLICK EVENT ===')
      console.log('Click - adding node at center:', position)
      console.log('Existing nodes count:', getNodesInternal().length)

      // Get node definition to create proper config
      const definition = nodeRegistry.get(nodeConfig.type)

      console.log('Node config:', nodeConfig)
      console.log('Node definition:', definition)

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

      console.log(
        'CREATE_NODE:',
        JSON.stringify({
          id: newNode.id,
          type: newNode.type,
          pos: newNode.position,
        })
      )

      // Use AABB collision detection to push away overlapping nodes
      const tempPositions = pushAwayOverlappingNodes(
        newNode.id,
        position.x,
        position.y,
        180,
        80,
        getNodesInternal
      )

      console.log(`Pushed ${tempPositions.size} nodes`)

      // Batch update: push existing nodes AND add new node in one operation
      setNodesInternal((nds) => {
        const updatedNodes = nds.map((n) => {
          const newPos = tempPositions.get(n.id)
          return newPos ? { ...n, position: newPos } : n
        })
        return [...updatedNodes, newNode]
      })

      console.log('✅ Node added successfully')
      onChange?.()
    },
    [
      screenToFlowPosition,
      setNodesInternal,
      getNodesInternal,
      getNodeId,
      reactFlowWrapper,
      onChange,
    ]
  )

  return {
    onDrop,
    onDragOver,
    onNodeDragStop,
    addNodeAtCenter,
  }
}
