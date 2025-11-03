import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { WorkflowDetail } from '@/types/workflow'
import { IconBrandStackshare } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

export function WorkflowCards({ workflows }: { workflows: WorkflowDetail[] }) {
  const router = useRouter()

  return (
    <div className="max-w-screen-xl grid grid-cols-1 gap-5 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 @7xl/main:grid-cols-4">
      {workflows &&
        workflows?.map((workflow) => (
          <Card
            className="@container/card cursor-pointer py-0 shadow-2xl hover:shadow-3xl"
            key={workflow.workflow_id}
            onClick={() => {
              router.push(
                `/edit?version=draft&workflow=${workflow.workflow_id}`
              )
            }}
          >
            <CardContent className="!p-4">
              <div className="flex items-center justify-center gap-2 bg-amber-200 rounded-md size-7">
                <IconBrandStackshare className="size-4" />
              </div>

              <div className="mt-8 font-semibold text-sm">{workflow.name}</div>
              <div className="mt-2 text-muted-foreground text-xs">
                {formatDateTime(
                  // Prefer OpenAI updated_at (seconds), fallback to ISO updatedAt or current time
                  workflow.update_time
                    ? new Date(workflow.update_time).toISOString()
                    : workflow.update_time || new Date().toISOString()
                )}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
