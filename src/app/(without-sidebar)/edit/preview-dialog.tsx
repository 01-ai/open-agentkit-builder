'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { exportWorkflow } from '@/lib/export/export-workflow'
import { Edge, Node } from '@xyflow/react'
import { Check, Copy, Download } from 'lucide-react'
import { useState } from 'react'

/**
 * Preview Dialog
 * Shows the exported workflow JSON in OpenAI format
 */
export function PreviewDialog({
  nodes,
  edges,
  workflowName,
  workflowId,
}: {
  nodes: Node[]
  edges: Edge[]
  workflowName?: string
  workflowId?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const json = exportWorkflow(nodes, edges, workflowName, workflowId)
  const jsonString = JSON.stringify(json, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName || 'workflow'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full px-4">
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow JSON (OpenAI Format)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {/* JSON Display */}
          <div className="flex-1 overflow-auto border rounded-lg bg-muted/30">
            <pre className="p-4 text-xs font-mono">
              <code>{jsonString}</code>
            </pre>
          </div>

          {/* Stats */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            {nodes.length} nodes • {edges.length} edges •{' '}
            {(jsonString.length / 1024).toFixed(1)} KB
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
