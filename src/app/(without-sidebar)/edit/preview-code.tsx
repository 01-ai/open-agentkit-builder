'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generatePythonSDK } from '@/lib/code-generator'
import { exportWorkflow } from '@/lib/export/export-workflow'
import Editor from '@monaco-editor/react'
import { Edge, Node } from '@xyflow/react'
import { Check, Code, Copy } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMemo, useState } from 'react'

const editorProps = {
  width: '100%',
  height: '100%',
  language: 'python',
  options: {
    readOnly: true,
    lineNumbers: 'off' as any,
    minimap: {
      enabled: false,
    },
    unicodeHighlight: {
      ambiguousCharacters: false,
    },
  },
}

export function PreviewCode({
  nodes,
  edges,
  workflowName,
  workflowId,
}: {
  nodes: Node[]
  edges: Edge[]
  workflowName: string
  workflowId?: string
}) {
  const { theme } = useTheme()

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light'
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const openaiJsonString = useMemo(() => {
    const json = exportWorkflow(nodes, edges, workflowName, workflowId)
    return JSON.stringify(json, null, 2)
  }, [nodes, edges, workflowName, workflowId])

  const { code, error } = useMemo(() => {
    return generatePythonSDK(openaiJsonString)
  }, [openaiJsonString])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Code className="h-4 w-4" />
        Code
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`max-w-[580px] dark:bg-slate-900 border-none ${code ? 'h-[80vh]' : ''}`}
        >
          <DialogHeader>
            <DialogTitle>Get code</DialogTitle>
          </DialogHeader>

          {error && <div className="p-4 text-xs text-red-500">{error}</div>}
          {code && (
            <div className="flex flex-col max-w-full max-h-[calc(100vh-12rem)] overflow-hidden border rounded-lg dark:bg-slate-950">
              <div className="flex items-center justify-between bg-muted/20 border-b border-muted px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Python</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                <Editor value={code} {...editorProps} theme={editorTheme} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
