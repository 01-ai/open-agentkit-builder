'use client'

import { agentNodeDefinition } from '@/lib/nodes/definitions/agent-node'
import { startNodeDefinition } from '@/lib/nodes/definitions/start-node'
import { Edge, Node } from '@xyflow/react'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface CanvasContextValue {
  // Selected node
  selectedNodeId: string | null
  setSelectedNodeId: (nodeId: string | null) => void

  // Nodes and edges
  nodes: Node[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  edges: Edge[]
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>

  // Helper methods
  getNode: (nodeId: string) => Node | undefined
  updateNodeConfig: (nodeId: string, config: any) => void
  updateNodeLabel: (nodeId: string, label: string) => void
}

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined)

export function CanvasProvider({
  children,
  initialNodes,
  initialEdges,
}: {
  children: ReactNode
  initialNodes?: Node[]
  initialEdges?: Edge[]
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])

  const [edges, setEdges] = useState<Edge[]>([])

  // Hydrate once from props when provided (after async workflow load)
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    const hasInitialNodes =
      Array.isArray(initialNodes) && initialNodes.length > 0
    const hasInitialEdges =
      Array.isArray(initialEdges) && initialEdges.length > 0
    if (hasInitialNodes || hasInitialEdges) {
      if (hasInitialNodes) setNodes(initialNodes as Node[])
      if (hasInitialEdges) setEdges(initialEdges as Edge[])
      hydratedRef.current = true
    }
  }, [initialNodes, initialEdges])

  // Initialize default canvas when no initial data provided
  useEffect(() => {
    // Only run when not hydrated from props and canvas is empty
    if (hydratedRef.current) return
    if (nodes.length > 0 || edges.length > 0) return

    // Create default Start node
    const startNode: Node = {
      id: 'start',
      type: 'start',
      position: { x: -150, y: 0 },
      data: {
        label: 'Start',
        subtitle: 'Start',
        nodeType: startNodeDefinition.nodeType,
        config: startNodeDefinition.getDefaultConfig(),
      },
    }

    // Create default Agent node with OpenAI-aligned defaults
    const agentConfig = {
      hidden_properties: null,
      instructions: {
        expression: 'You are a helpful assistant.',
        format: 'cel',
      },
      messages: [],
      model: {
        expression: 'gpt-5',
        format: 'cel',
      },
      reads_from_history: true,
      reasoning: {
        effort: 'low',
        summary: 'auto',
      },
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'medium',
      },
      tools: [],
      user_visible: true,
      variable_mapping: [],
      writes_to_history: true,
    }

    const agentNode: Node = {
      id: 'agent',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'My agent',
        subtitle: 'My agent',
        nodeType: agentNodeDefinition.nodeType,
        config: agentConfig,
        inputSchema: agentNodeDefinition.getInputSchema(),
      },
    }

    const defaultEdge: Edge = {
      id: 'edge_start_agent',
      source: startNode.id,
      sourceHandle: 'out',
      target: agentNode.id,
      targetHandle: 'in',
    }

    setNodes([startNode, agentNode])
    setEdges([defaultEdge])
  }, [nodes.length, edges.length])

  const getNode = (nodeId: string) => {
    return nodes.find((n) => n.id === nodeId)
  }

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      )
    )
  }

  const updateNodeLabel = (nodeId: string, label: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      )
    )
  }

  const value: CanvasContextValue = {
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    setNodes,
    edges,
    setEdges,
    getNode,
    updateNodeConfig,
    updateNodeLabel,
  }

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  )
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}
