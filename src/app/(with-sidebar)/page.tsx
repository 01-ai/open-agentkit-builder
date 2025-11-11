'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateWorkflowId } from '@/lib/export/export-workflow'
import { createWorkflow, getWorkflows } from '@/lib/services/workflows'
import { useAuthStore } from '@/lib/store/auth-store'
import type { WorkflowDetail } from '@/types/workflow'
import { IconPlus } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TemplateCards } from './components/template-cards'
import { WorkflowCards } from './components/workflow-cards'

// 模板元数据和导入映射
const TEMPLATES_MAP = {
  'data-enrichment': () => import('@/templates/data-enrichment.json'),
  'planning-helper': () => import('@/templates/planning-helper.json'),
  'customer-service': () => import('@/templates/customer-service.json'),
  'structured-data-QA': () => import('@/templates/structured-data-QA.json'),
  'document-comparison': () => import('@/templates/document-comparison.json'),
  'internal-knowledge-assistant': () =>
    import('@/templates/internal-knowledge-assistant.json'),
}

// 模板元数据
const TEMPLATE_METADATA = {
  'data-enrichment': {
    id: 'data-enrichment',
    name: 'Data enrichment',
    description: 'Pull together data to answer user questions',
  },
  'planning-helper': {
    id: 'planning-helper',
    name: 'Planning helper',
    description: 'Simple multi-turn workflow for creating work plans',
  },
  'customer-service': {
    id: 'customer-service',
    name: 'Customer service',
    description: 'Resolve customer queries with custom policies',
  },
  'structured-data-QA': {
    id: 'structured-data-QA',
    name: 'Structured Data Q/A',
    description: 'Query databases using natural language',
  },
  'document-comparison': {
    id: 'document-comparison',
    name: 'Document comparison',
    description: 'Analyze and highlight differences across uploaded documents',
  },
  'internal-knowledge-assistant': {
    id: 'internal-knowledge-assistant',
    name: 'Internal knowledge assistant',
    description: 'Triage and answer questions from employees',
  },
} as const

interface Template {
  id: string
  name: string
  description: string
  filename: string
}

export default function Page() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  const isInitialized = useAuthStore((state) => state.isInitialized)
  const [workflows, setWorkflows] = useState<WorkflowDetail[]>([])

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'drafts' | 'templates'>('drafts')

  const user_id = user?.user_id

  useEffect(() => {
    if (isInitialized && user) {
      // 已登录，加载工作流和模板
      loadWorkflows()
    }
  }, [isInitialized, user])

  async function loadWorkflows() {
    try {
      const res = await getWorkflows()
      setWorkflows(res)
    } catch (error) {
      console.error('Failed to load workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleCreateWorkflow() {
    if (!user) {
      toast.error('Please login first')
      return
    }
    router.push('/edit')
  }

  async function createFromTemplate(templateId: string) {
    if (!user) {
      toast.error('Please login first')
      return
    }

    const template = TEMPLATES_MAP[templateId as keyof typeof TEMPLATES_MAP]
    if (!template) {
      toast.error('Template not found')
      return
    }

    const { default: templateData } = await template()
    if (!templateData) {
      toast.error('Failed to load template')
      return
    }

    try {
      const response = await createWorkflow({
        ...templateData,
        id: generateWorkflowId(),
      })
      router.push(`/edit?version=draft&workflow=${response.workflow_id}`)
    } catch (error) {
      console.error('Failed to create workflow from template:', error)
      alert('Failed to create workflow from template')
    }
  }

  const templates = Object.values(TEMPLATE_METADATA) as Template[]

  return (
    <AuthGuard>
      <div className="container mx-auto p-8 h-full">
        <div className="text-lg font-bold">Agent Builder</div>
        <div className="flex flex-col items-center px-4 py-12 gap-4">
          <h2 className="text-2xl font-bold">Create a workflow</h2>
          <p>Build a chat agent workflow with custom logic and tools</p>
          <Button
            onClick={handleCreateWorkflow}
            size="lg"
            className="mt-4 cursor-pointer rounded-full"
          >
            <IconPlus /> Create
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'drafts' | 'templates')
          }
          className="w-full"
        >
          <TabsList className="mb-8">
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            {loading ? (
              <div className="max-w-screen-xl grid grid-cols-1 gap-5 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 @7xl/main:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="@container/card py-0 shadow-2xl rounded-lg overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No workflows yet. Create one or use a template to get started.
              </div>
            ) : (
              <WorkflowCards workflows={workflows} />
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateCards
              templates={templates}
              onSelectTemplate={createFromTemplate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
