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

      console.log('DROP:', JSON.stringify({ type, pos: position }))

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

      // Call parent update callback if provided (for While node parent-child management)
      // This may change the parentId and returns the new parent ID
      let finalParentId: string | undefined = undefined
      if (onParentUpdate) {
        finalParentId = onParentUpdate(node)
        onChange?.()
      }

      // After parent relationship is established, trigger collision detection
      // Wait for state to update, then check collisions based on final parent status
      setTimeout(() => {
        const currentNodes = getNodesInternal()
        const updatedNode = currentNodes.find((n) => n.id === node.id)

        if (!updatedNode) return

        // Determine collision detection scope based on final parent status
        if (finalParentId) {
          // Child node: check collisions with siblings (same parent)
          console.log('Child node - checking collisions with siblings only')

          const siblings = currentNodes.filter(
            (n) => n.parentId === finalParentId && n.id !== node.id
          )

          if (siblings.length > 0) {
            // Use relative coordinates for collision detection
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
                  const collisionCheckCallback = () => {
                    console.log('Checking collisions after While node resize')
                    const currentNodes = getNodesInternal()
                    const resizedWhileNode = currentNodes.find(
                      (n) => n.id === finalParentId
                    )
                    if (resizedWhileNode) {
                      // Check collisions with all top-level nodes (excluding children)
                      const topLevelNodes = currentNodes.filter(
                        (n) => !n.parentId
                      )
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
                        () => topLevelNodes
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
        } else {
          // Top-level node: check collisions with all other top-level nodes
          console.log(
            'Top-level node - checking collisions with all top-level nodes'
          )

          const topLevelNodes = currentNodes.filter(
            (n) => !n.parentId && n.id !== node.id
          )

          const tempPositions = pushAwayOverlappingNodes(
            updatedNode.id,
            updatedNode.position.x,
            updatedNode.position.y,
            180,
            80,
            () => topLevelNodes
          )

          if (tempPositions.size > 0) {
            console.log(`Pushed ${tempPositions.size} top-level nodes`)

            setNodesInternal((nds) =>
              nds.map((n) => {
                const newPos = tempPositions.get(n.id)
                return newPos ? { ...n, position: newPos } : n
              })
            )
          } else {
            console.log('No collision detected')
          }
        }

        onChange?.()
      }, 0)
    },
    [getNodesInternal, setNodesInternal, onChange]
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

      console.log(
        'CLICK_ADD:',
        JSON.stringify({
          type: nodeConfig.type,
          pos: position,
          existingCount: getNodesInternal().length,
        })
      )

      // Get node definition to create proper config
      const definition = nodeRegistry.get(nodeConfig.type)

      console.log(
        'NODE_CONFIG:',
        JSON.stringify({ type: nodeConfig.type, label: nodeConfig.label })
      )

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
