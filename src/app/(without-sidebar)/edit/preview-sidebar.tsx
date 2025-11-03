'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportWorkflow } from '@/lib/export/export-workflow'
import type { Edge, Node } from '@xyflow/react'
import { Check, Copy, Download, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface PreviewSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: Node[]
  edges: Edge[]
  workflowName?: string
  workflowId?: string
}

function minimalNodes(nodes: Node[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }))
}

function minimalEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }))
}

export function PreviewSidebar({
  open,
  onOpenChange,
  nodes,
  edges,
  workflowName = 'workflow',
  workflowId,
}: PreviewSidebarProps) {
  const [activeTab, setActiveTab] = useState<'rf' | 'openai'>('openai')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setActiveTab('openai')
  }, [open])

  const reactFlowJsonString = useMemo(() => {
    // const payload = { nodes: minimalNodes(nodes), edges: minimalEdges(edges) }
    const payload = { nodes, edges }
    return JSON.stringify(payload, null, 2)
  }, [nodes, edges])

  const openaiJsonString = useMemo(() => {
    const json = exportWorkflow(nodes, edges, workflowName, workflowId)
    return JSON.stringify(json, null, 2)
  }, [nodes, edges, workflowName, workflowId])

  const textToCopy = activeTab === 'rf' ? reactFlowJsonString : openaiJsonString

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    const jsonStr = textToCopy
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = activeTab === 'rf' ? 'reactflow' : 'openai'
    a.download = `${workflowName || 'workflow'}.${suffix}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <aside className="fixed top-14 right-0 bottom-0 z-30 w-[520px] max-w-full border-l bg-background shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b">
        <div className="font-medium">Preview</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="px-4 pt-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'rf' | 'openai')}
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="rf">React Flow</TabsTrigger>
              <TabsTrigger value="openai">OpenAI JSON</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <TabsContent value="rf" className="mt-3">
            <div className="h-[calc(100vh-14rem)] sm:h-[calc(100vh-12rem)] overflow-auto border rounded-lg bg-muted/30">
              <pre className="p-4 text-xs font-mono">
                <code>{reactFlowJsonString}</code>
              </pre>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {nodes.length} nodes • {edges.length} edges •{' '}
              {(reactFlowJsonString.length / 1024).toFixed(1)} KB
            </div>
          </TabsContent>

          <TabsContent value="openai" className="mt-3">
            <div className="h-[calc(100vh-14rem)] sm:h-[calc(100vh-12rem)] overflow-auto border rounded-lg bg-muted/30">
              <pre className="p-4 text-xs font-mono">
                <code>{openaiJsonString}</code>
              </pre>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {nodes.length} nodes • {edges.length} edges •{' '}
              {(openaiJsonString.length / 1024).toFixed(1)} KB
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}
