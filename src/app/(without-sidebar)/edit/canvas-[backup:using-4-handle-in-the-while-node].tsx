'use client'

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  Node,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasProvider, useCanvas } from './canvas/canvas-provider'
import {
  InteractionMode,
  InteractionToolbar,
} from './canvas/interaction-toolbar'
import { NodeConfigPanel } from './canvas/node-config-panel'
import { NodePalette } from './canvas/node-palette'
import { useHistory } from './canvas/use-history'
import { useNodeOperations } from './canvas/use-node-operations'
import { useParentNode } from './canvas/use-parent-node'
import {
  AgentNode,
  EndNode,
  FileSearchNode,
  GuardrailsNode,
  IfElseNode,
  McpNode,
  NoteNode,
  SetStateNode,
  StartNode,
  TransformNode,
  UserApprovalNode,
  WhileNode,
} from './ui-nodes'

import { nodeRegistry } from '@/lib/nodes/registry'

// Import node definitions to register them
import '@/lib/nodes/definitions'
import WhileInnerConnectingEdge from './ui-nodes/base/while-inner-connecting-edge'

// Node types mapping for ReactFlow
const nodeTypes = {
  agent: AgentNode,
  start: StartNode,
  end: EndNode,
  note: NoteNode,
  'if-else': IfElseNode,
  while: WhileNode,
  'set-state': SetStateNode,
  'user-approval': UserApprovalNode,
  transform: TransformNode,
  mcp: McpNode,
  guardrails: GuardrailsNode,
  'file-search': FileSearchNode,
}

const edgeTypes = {
  'while-inner-connecting': WhileInnerConnectingEdge,
}

const topologicalSort = (nodes: Node[]): Node[] => {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adj.set(node.id, [])
  }

  for (const node of nodes) {
    if (node.parentId) {
      adj.get(node.parentId)?.push(node.id)
      inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const sorted: Node[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  while (queue.length > 0) {
    const id = queue.shift()!
    const node = nodeMap.get(id)
    if (node) {
      sorted.push(node)
    }

    for (const childId of adj.get(id) || []) {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1)
      if (inDegree.get(childId) === 0) {
        queue.push(childId)
      }
    }
  }

  return sorted
}

/**
 * Canvas Content Component
 * Main canvas area with node palette and ReactFlow
 */
function CanvasContent({
  onChange,
  onDataChange,
  previewOpen,
  collisionDetection = true, // Add collisionDetection prop
}: {
  onChange?: () => void
  onDataChange?: (nodes: Node[], edges: Edge[]) => void
  previewOpen?: boolean
  collisionDetection?: boolean // Add collisionDetection prop
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { getNode, getInternalNode } = useReactFlow()

  // Get context from provider
  const {
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    setNodes,
    edges,
    setEdges,
    updateNodeConfig,
  } = useCanvas()

  // Track initialization to avoid triggering onChange on initial load
  const initialized = useRef(false)

  // Interaction mode state (default to 'pan' - ReactFlow default behavior)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('pan')

  // History management
  const { canUndo, canRedo, undo, redo, takeSnapshot } = useHistory(
    (nodes, edges) => {
      setNodes(nodes)
      setEdges(edges)
    }
  )

  // Mark as initialized after first render
  useEffect(() => {
    initialized.current = true
    // Take initial snapshot
    takeSnapshot(nodes, edges)
  }, [])

  // Notify parent of data changes (also during initial hydration)
  useEffect(() => {
    onDataChange?.(nodes, edges)
  }, [nodes, edges, onDataChange])

  // Removed: do not auto-trigger onChange when defaults appear

  // Node operations hook (pass nodes getter and setter)
  const { onDrop, onDragOver, onNodeDragStop, addNodeAtCenter } =
    useNodeOperations(
      reactFlowWrapper,
      () => nodes,
      setNodes,
      onChange,
      collisionDetection // Pass collisionDetection to the hook
    )

  // Parent node management hook (for While nodes)
  const { updateParentOnDrag, autoResizeWhileNode } = useParentNode()

  // Wrap onNodeDragStop to include parent-child management
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Call original drag stop handler with parent update and auto-resize callbacks
      onNodeDragStop(
        event,
        node,
        updateParentOnDrag,
        (parentId, onCollisionCheck, shouldTriggerCollision) => {
          autoResizeWhileNode(
            parentId,
            onCollisionCheck,
            shouldTriggerCollision
          )
        }
      )
    },
    [onNodeDragStop, updateParentOnDrag, autoResizeWhileNode]
  )

  // Handle node click
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }

  // Handle pane click (clicking on canvas background)
  const handlePaneClick = () => {
    setSelectedNodeId(null)
  }

  // Handle config change
  const handleConfigChange = (nodeId: string, newConfig: any) => {
    updateNodeConfig(nodeId, newConfig)
    // Notify parent of changes
    onChange?.()
  }

  // Handle delete selected node
  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return
    const nodeId = selectedNodeId

    const newNodes = nodes.filter((n) => n.id !== nodeId)
    const newEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    )

    setNodes(newNodes)
    setEdges(newEdges)
    setSelectedNodeId(null)

    if (initialized.current) {
      setTimeout(() => {
        takeSnapshot(newNodes, newEdges)
      }, 0)
      onChange?.()
    }
  }, [
    selectedNodeId,
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNodeId,
    takeSnapshot,
    onChange,
  ])

  // Notify parent when nodes or edges change (but not during initialization)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Pre-compute removed node ids and the filtered edges if necessary
      const removedIds = new Set(
        changes
          .filter((c) => c.type === 'remove')
          .map((c) => (c as any).id as string)
      )

      const filteredEdges =
        removedIds.size > 0
          ? edges.filter(
              (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
            )
          : edges

      // Compute new nodes for snapshot purpose using current nodes
      const newNodesForSnapshot = applyNodeChanges(changes, nodes)

      // Apply nodes change using functional updater to avoid races
      setNodes((nds) => applyNodeChanges(changes, nds))

      // If nodes were removed, drop connected edges in one go
      if (removedIds.size > 0) {
        setEdges(filteredEdges)
      }

      // Take snapshot for certain change types (but not during drag)
      if (initialized.current) {
        const shouldSnapshot = changes.some(
          (change) =>
            change.type === 'remove' ||
            change.type === 'add' ||
            (change.type === 'position' && change.dragging === false)
        )

        if (shouldSnapshot) {
          // Defer snapshot to next tick and include filtered edges
          setTimeout(() => {
            takeSnapshot(newNodesForSnapshot, filteredEdges)
          }, 0)
        }

        onChange?.()
      }
    },
    [onChange, setNodes, setEdges, takeSnapshot, nodes, edges]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds)

        // Take snapshot for remove/add changes
        if (initialized.current) {
          const shouldSnapshot = changes.some(
            (change) => change.type === 'remove' || change.type === 'add'
          )

          if (shouldSnapshot) {
            setTimeout(() => {
              takeSnapshot(nodes, newEdges)
            }, 0)
          }
        }

        return newEdges
      })

      if (initialized.current) {
        onChange?.()
      }
    },
    [onChange, setEdges, takeSnapshot, nodes]
  )

  // Handle new connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      console.log('handleConnect.............', connection)
      // {
      //     "source": "node_1761122126570_0.9742013735346611",
      //     "sourceHandle": "in",
      //     "target": "node_1761121419448_0.8653393459174422",
      //     "targetHandle": "in-external"
      // }
      // For While nodes: replace external handles with internal handles when appropriate
      let finalConnection = { ...connection } as Edge

      const sourceNode = getInternalNode(connection.source) // nodes.find((n) => n.id === connection.source)
      const targetNode = getInternalNode(connection.target) //nodes.find((n) => n.id === connection.target)

      if (!sourceNode || !targetNode) {
        return
      }

      const sourceIsWhile = sourceNode.type === 'while'
      const targetIsWhile = targetNode.type === 'while'
      const sourceIsChildOfTarget = sourceNode.parentId === connection.target
      const targetIsChildOfSource = targetNode.parentId === connection.source

      // one is while, the other is child of the while
      if (
        (sourceIsWhile && targetIsChildOfSource) ||
        (targetIsWhile && sourceIsChildOfTarget)
      ) {
        finalConnection.type = 'while-inner-connecting'

        const parentNode = sourceIsChildOfTarget ? targetNode : sourceNode
        const parentHandleId =
          connection.source === parentNode.id
            ? connection.sourceHandle
            : connection.targetHandle

        const replacedHandleId =
          parentHandleId?.replace('external', 'internal') || ''

        Object.keys(finalConnection).forEach((key) => {
          if (finalConnection[key as keyof Connection] === parentHandleId!) {
            console.log(
              'replace',
              key,
              'from',
              parentHandleId,
              'to',
              replacedHandleId
            )
            finalConnection[key as keyof Connection] = replacedHandleId
          }
        })
      }

      // Replace external handles with internal handles when connecting to child nodes
      // if (sourceIsWhile) {
      //   if (targetIsChildOfSource) {
      //     // While connecting to internal child: replace out-external with out-internal
      //     if (connection.sourceHandle === 'out-external') {
      //       finalConnection.sourceHandle = 'out-internal'
      //     }
      //   }
      //   // For external connections, out-external stays as is
      // }

      // if (targetIsWhile) {
      //   if (sourceIsChildOfTarget) {
      //     // Internal child connecting to While: replace external with internal
      //     if (
      //       connection.targetHandle === 'in-external' ||
      //       connection.targetHandle === 'out-external'
      //     ) {
      //       // Determine whether to use in-internal or out-internal based on source
      //       if (connection.sourceHandle === 'out') {
      //         finalConnection.targetHandle = 'out-internal'
      //       } else if (connection.sourceHandle === 'in') {
      //         finalConnection.targetHandle = 'in-internal'
      //       }
      //     }
      //   }
      //   // For external connections, in-external stays as is
      // }

      setEdges((eds) => {
        const newEdges = addEdge(finalConnection, eds)

        if (initialized.current) {
          setTimeout(() => {
            takeSnapshot(nodes, newEdges)
          }, 0)
        }

        return newEdges
      })

      if (initialized.current) {
        onChange?.()
      }
    },
    [onChange, setEdges, takeSnapshot, nodes]
  )

  // Normalize nodes to always include a valid position and ensure parent nodes come before children
  const safeNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return nodes

    const filteredNodes = nodes.filter(Boolean).map((n) => ({
      ...n,
      position: {
        x: (n as any)?.position?.x ?? 0,
        y: (n as any)?.position?.y ?? 0,
      },
    }))

    // Sort nodes to ensure parent nodes come before their children
    // This is required by React Flow for proper parent-child relationship handling
    return topologicalSort(filteredNodes)
  }, [nodes])

  // Filter edges that reference missing nodes
  const safeEdges = useMemo(() => {
    if (!edges || edges.length === 0) return edges
    const idSet = new Set((safeNodes || []).map((n) => n.id))
    return edges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
  }, [safeNodes, edges])

  // Get selected node
  const selectedNode = selectedNodeId
    ? safeNodes?.find((n) => n.id === selectedNodeId) || null
    : null

  const checkValidConnection = useCallback(
    (connection: Connection) => {
      // Rule 1: Node cannot connect to itself
      if (connection.source === connection.target) {
        return false
      }

      // Rule 2: Both nodes must exist
      const sourceNode = getInternalNode(connection.source) //nodes.find((n) => n.id === connection.source)
      const targetNode = getInternalNode(connection.target) //nodes.find((n) => n.id === connection.target)

      if (!sourceNode || !targetNode) {
        return false
      }

      const sourceIsWhile = sourceNode.type === 'while'
      const targetIsWhile = targetNode.type === 'while'
      const sourceIsChildOfTarget = sourceNode.parentId === connection.target
      const targetIsChildOfSource = targetNode.parentId === connection.source

      // one is while, the other is child of the while
      if (
        (sourceIsWhile && targetIsChildOfSource) ||
        (targetIsWhile && sourceIsChildOfTarget)
      ) {
        // connection:
        //   {
        //     "source": "node_1761121419448_0.8653393459174422",
        //     "sourceHandle": "in-external",
        //     "target": "node_1761122126570_0.9742013735346611",
        //     "targetHandle": "in"
        // }
        const parentNode = sourceIsChildOfTarget ? targetNode : sourceNode
        const childNode = sourceIsChildOfTarget ? sourceNode : targetNode
        const parentHandleId =
          connection.source === parentNode.id
            ? connection.sourceHandle
            : connection.targetHandle
        const childHandleId =
          connection.source === childNode.id
            ? connection.sourceHandle
            : connection.targetHandle
        const parentHandles = [
          ...(parentNode.internals.handleBounds?.source || []),
          ...(parentNode.internals.handleBounds?.target || []),
        ]
        const childHandles = [
          ...(childNode.internals.handleBounds?.target || []),
          ...(childNode.internals.handleBounds?.source || []),
        ]

        const parentHandle = parentHandles.find(
          (h) => h.id === parentHandleId
        ) as Handle
        const childHandle = childHandles.find(
          (h) => h.id === childHandleId
        ) as Handle

        // parentHandle and childHandle must have the same type
        // onConnect will replace the parentHandle type to opposite type
        return (
          parentHandle && childHandle && parentHandle.type === childHandle.type
        )
      } else if (sourceNode.parentId !== targetNode.parentId) {
        // source and target must has same parentId or both are undefined
        return false
      }

      // Rule 4: While node connection rules
      // Strict handle matching based on node relationships:
      // Internal child -> While connections:
      //   - child.out -> while.out-external (becomes while.out-internal)
      //   - child.in -> while.in-external (becomes while.in-internal)
      // While -> Internal child connections:
      //   - while.in-external -> child.out (becomes while.in-internal)
      //   - while.out-external -> child.in (becomes while.out-internal)

      // if (sourceIsWhile && !targetIsWhile) {
      //   // While as source (While -> target node)
      //   if (targetIsChildOfSource) {
      //     // While -> internal child
      //     // Check if in-internal is already connected (avoid multiple)
      //     const hasInInternalEdge = safeEdges.some(
      //       (e) =>
      //         e.source === connection.source && e.sourceHandle === 'in-internal'
      //     )
      //     if (hasInInternalEdge) {
      //       return false
      //     }

      //     // Check if out-internal is already connected
      //     const hasOutInternalEdge = safeEdges.some(
      //       (e) =>
      //         e.target === connection.source &&
      //         e.targetHandle === 'out-internal'
      //     )
      //     if (hasOutInternalEdge) {
      //       return false
      //     }

      //     // Only allow: in-external -> child.out OR out-external -> child.in
      //     return (
      //       (connection.sourceHandle === 'in-external' &&
      //         connection.targetHandle === 'out') ||
      //       (connection.sourceHandle === 'out-external' &&
      //         connection.targetHandle === 'in')
      //     )
      //   } else {
      //     // While -> external node
      //     // Only: out-external -> external.in
      //     return (
      //       connection.sourceHandle === 'out-external' &&
      //       connection.targetHandle === 'in'
      //     )
      //   }
      // }

      // if (targetIsWhile && !sourceIsWhile) {
      //   // While as target (source node -> While)
      //   if (sourceIsChildOfTarget) {
      //     // Internal child -> While
      //     // Check if in-internal is already connected
      //     const hasInInternalEdge = safeEdges.some(
      //       (e) =>
      //         e.target === connection.target && e.targetHandle === 'in-internal'
      //     )
      //     if (hasInInternalEdge) {
      //       return false
      //     }

      //     // Check if out-internal is already connected
      //     const hasOutInternalEdge = safeEdges.some(
      //       (e) =>
      //         e.source === connection.target &&
      //         e.sourceHandle === 'out-internal'
      //     )
      //     if (hasOutInternalEdge) {
      //       return false
      //     }

      //     // Only allow: child.out -> out-external OR child.in -> in-external
      //     return (
      //       (connection.sourceHandle === 'out' &&
      //         connection.targetHandle === 'out-external') ||
      //       (connection.sourceHandle === 'in' &&
      //         connection.targetHandle === 'in-external')
      //     )
      //   } else {
      //     // External node -> While
      //     // Only: external.out -> in-external
      //     return (
      //       connection.sourceHandle !== 'in' &&
      //       connection.targetHandle === 'in-external'
      //     )
      //   }
      // }

      // Both are While nodes - not allowed
      // if (sourceIsWhile && targetIsWhile) {
      //   return false
      // }

      return true
    },
    [safeNodes, safeEdges]
  )

  return (
    <div className="flex-1 flex relative">
      <div className="absolute inset-0">
        {/* Left Sidebar - Node Palette */}
        <NodePalette
          onAddNode={addNodeAtCenter}
          className="absolute z-10 left-1"
        />

        {/* Canvas Area */}
        <div
          className="flex-1 absolute inset-0 canvas-inner-shadow"
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={safeNodes}
            edges={safeEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={(edge) =>
              checkValidConnection(edge as unknown as Connection)
            }
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            // Interaction mode settings
            // Pan mode: ReactFlow default behavior (no special config needed)
            // - Drag empty space to pan canvas
            // - Drag nodes to move them
            // - Shift + drag to select
            // Select mode: Design tool controls (like Figma)
            // - Direct drag to select/move nodes
            // - Scroll/middle/right mouse to pan
            {...(interactionMode === 'select' && {
              panOnDrag: [1, 2],
              panOnScroll: true,
              selectionOnDrag: true,
            })}
          >
            <Background variant={BackgroundVariant.Dots} gap={15} size={0.8} />
            <Controls />
          </ReactFlow>

          {/* Node Configuration Panel - Top Right */}
          {selectedNode?.data?.nodeType &&
          typeof selectedNode.data.nodeType === 'string' &&
          nodeRegistry.get(selectedNode.data.nodeType)?.ConfigComponent ? (
            <NodeConfigPanel
              nodeId={selectedNode.id}
              nodeType={selectedNode.data.nodeType}
              config={selectedNode.data.config || {}}
              onDelete={handleDeleteNode}
              onChange={(newConfig) =>
                handleConfigChange(selectedNode.id, newConfig)
              }
              previewOpen={previewOpen}
            />
          ) : null}

          {/* Interaction Toolbar */}
          <InteractionToolbar
            mode={interactionMode}
            onModeChange={setInteractionMode}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Canvas Component
 * Main export with CanvasProvider wrapper
 * Note: ReactFlowProvider is provided by parent (page.tsx)
 */
export function Canvas({
  onChange,
  onDataChange,
  initialNodes,
  initialEdges,
  previewOpen,
  collisionDetection = true, // Add collisionDetection prop
}: {
  onChange?: () => void
  onDataChange?: (nodes: Node[], edges: Edge[]) => void
  initialNodes?: Node[]
  initialEdges?: Edge[]
  previewOpen?: boolean
  collisionDetection?: boolean // Add collisionDetection prop
}) {
  return (
    <CanvasProvider initialNodes={initialNodes} initialEdges={initialEdges}>
      <CanvasContent
        onChange={onChange}
        onDataChange={onDataChange}
        previewOpen={previewOpen}
        collisionDetection={collisionDetection} // Pass collisionDetection to CanvasContent
      />
    </CanvasProvider>
  )
}
