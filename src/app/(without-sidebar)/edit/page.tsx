'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exportWorkflow, WorkflowOutput } from '@/lib/export/export-workflow'
import { importWorkflowToCanvas } from '@/lib/export/import-workflow'
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  updateWorkflow,
} from '@/lib/services/apis'
import { useAuthStore } from '@/lib/store/auth-store'
import { Workflow } from '@/types/workflow'
import {
  IconCopy,
  IconEdit,
  IconPlayerPlayFilled,
  IconTrash,
} from '@tabler/icons-react'
import { ReactFlowProvider } from '@xyflow/react'
import { ChevronLeft, Ellipsis, FileText, PlayCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Canvas } from './canvas'
import { PreviewCode } from './preview-code'
import { PreviewSidebar } from './preview-sidebar'

function EditPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workflowId = searchParams.get('workflow')
  const version = searchParams.get('version')
  const { user } = useAuthStore()
  const user_id = user?.user_id

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)

  // Store canvas data for preview
  const [canvasNodes, setCanvasNodes] = useState<any[]>([])
  const [canvasEdges, setCanvasEdges] = useState<any[]>([])

  // Rename dialog state
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Preview sidebar state
  const [previewOpen, setPreviewOpen] = useState(false)

  // Track last saved state to detect changes
  const lastSavedRef = useRef<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  })
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // If we already have a workflow with this ID, don't reload
    if (workflowId && workflow?.id === workflowId) {
      return
    }

    if (workflowId) {
      // Load existing workflow
      ;(async () => {
        try {
          const res = await getWorkflow(workflowId)

          setWorkflow(res.workflow_data)
          setNewName(res.name)

          const data = res.workflow_data

          // hydrate canvas from OpenAI workflow
          if (data?.nodes && data?.edges && data?.ui_metadata) {
            const { nodes, edges } = importWorkflowToCanvas(
              data as unknown as WorkflowOutput
            )

            setCanvasNodes(nodes as any)
            setCanvasEdges(edges as any)
            // Mark as saved state to avoid triggering auto-save on load
            lastSavedRef.current = { nodes: nodes as any, edges: edges as any }
          }
        } catch (error) {
          console.error('Failed to load workflow:', error)
          toast.error('Failed to load workflow')
        } finally {
          setLoading(false)
        }
      })()
    } else {
      // 没有 workflow ID，显示空白画布
      setLoading(false)
    }
  }, [workflowId, workflow?.id])

  // Handle canvas data changes (for preview and auto-save)
  const handleCanvasDataChange = useCallback(
    (nodes: any[], edges: any[]) => {
      setCanvasNodes(nodes)
      setCanvasEdges(edges)

      // Skip if no nodes (initial empty state)
      if (nodes.length === 0) return

      // Check if data actually changed
      const hasChanged =
        JSON.stringify(nodes) !== JSON.stringify(lastSavedRef.current.nodes) ||
        JSON.stringify(edges) !== JSON.stringify(lastSavedRef.current.edges)

      if (!hasChanged) return

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // Set new timer for auto-save
      saveTimerRef.current = setTimeout(async () => {
        try {
          const openai = exportWorkflow(
            nodes as any,
            edges as any,
            workflow?.name || 'New workflow',
            workflow?.id
          )

          if (!workflowId) {
            // Create new workflow
            const newWorkflow = await createWorkflow(openai)

            console.log('response', newWorkflow)

            setWorkflow(newWorkflow.workflow_data)
            setNewName(newWorkflow.name)

            // Update last saved state
            lastSavedRef.current = { nodes, edges }

            // Update URL
            router.replace(
              `/edit?version=draft&workflow=${newWorkflow.workflow_id}`
            )
            toast.success('Workflow created!')
          } else {
            const res = await updateWorkflow(workflowId, openai)

            // Update last saved state
            lastSavedRef.current = { nodes, edges }

            console.log('Auto-saved workflow')
          }
        } catch (error) {
          console.error('Failed to auto-save workflow:', error)
          toast.error('Failed to save workflow')
        }
      }, 800)
    },
    [workflowId, workflow?.name, router]
  )

  // Handle canvas changes (for undo/redo tracking)
  const handleCanvasChange = useCallback(() => {
    // This is called for user interactions that should be tracked
    // The actual saving is handled by handleCanvasDataChange
  }, [])

  // 重命名工作流
  async function handleRename() {
    if (!workflowId || !newName.trim()) return

    setRenaming(true)
    try {
      const res = await updateWorkflow(workflowId, {
        ...workflow,
        name: newName?.trim(),
      })

      setWorkflow(res.workflow_data)
      setRenameOpen(false)
      toast.success('Workflow renamed')
    } catch (error) {
      console.error('Failed to rename workflow:', error)
      toast.error('Failed to rename workflow')
    } finally {
      setRenaming(false)
    }
  }

  // 删除工作流
  async function handleDelete() {
    if (!workflowId || !deleteConfirmed) return

    setDeleting(true)
    try {
      await deleteWorkflow(workflowId)

      toast.success('Workflow deleted')
      router.push('/')
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      toast.error('Failed to delete workflow')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-builder-background">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 h-14 -mr-1">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {workflow ? workflow.name : 'New workflow'}
          </h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
            <FileText className="h-3 w-3" />
            <span>Draft</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* 操作菜单 */}
          {workflowId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <IconCopy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <IconEdit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteConfirmed(false)
                    setDeleteOpen(true)
                  }}
                  className="text-destructive"
                >
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <PlayCircle className="h-4 w-4" />
            Evaluate
          </Button>

          <PreviewCode
            nodes={canvasNodes as any}
            edges={canvasEdges as any}
            workflowName={workflow?.name || 'workflow'}
            workflowId={workflow?.id}
          />

          <span className="w-0.5"></span>

          <Button
            variant="secondary"
            size="sm"
            className="rounded-full !px-4 gap-2"
            onClick={() => setPreviewOpen((o) => !o)}
          >
            <IconPlayerPlayFilled className="size-3" />
            <span>Preview</span>
          </Button>

          <Button size="sm" className="rounded-full px-4">
            Publish
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <Canvas
        onChange={handleCanvasChange}
        onDataChange={handleCanvasDataChange}
        initialNodes={canvasNodes.length > 0 ? canvasNodes : undefined}
        initialEdges={canvasEdges.length > 0 ? canvasEdges : undefined}
        previewOpen={previewOpen}
        collisionDetection={true}
      />

      {/* Preview Sidebar */}
      <PreviewSidebar
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        nodes={canvasNodes as any}
        edges={canvasEdges as any}
        workflowName={workflow?.name || 'workflow'}
        workflowId={workflow?.id}
      />

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename &quot;{workflow?.name}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">New name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renaming || !newName?.trim()}
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete workflow &quot;{workflow?.name}&quot;?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4 py-4">
            <p>
              Deleting this workflow will permanently remove all of its versions
              and cause API calls referencing it to fail.
            </p>
            <p>
              If your code references this workflow by workflow_id, those API
              requests will no longer work. The workflow will also be
              inaccessible to anyone in your project.
            </p>
          </DialogDescription>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-delete"
                checked={deleteConfirmed}
                onCheckedChange={(checked) =>
                  setDeleteConfirmed(checked as boolean)
                }
              />
              <label
                htmlFor="confirm-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I want to delete this workflow
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!deleteConfirmed || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReactFlowProvider>
        <EditPageContent />
      </ReactFlowProvider>
    </Suspense>
  )
}
