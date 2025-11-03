import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { IconBrandStackshare } from '@tabler/icons-react'

interface Template {
  id: string
  name: string
  description: string
  filename: string
}

interface TemplateCardsProps {
  templates: Template[]
  onSelectTemplate: (templateId: string) => void
}

export function TemplateCards({
  templates,
  onSelectTemplate,
}: TemplateCardsProps) {
  return (
    <div className="max-w-screen-xl grid grid-cols-1 gap-5 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 @7xl/main:grid-cols-4">
      {templates &&
        templates?.map((template) => (
          <Card
            className="@container/card cursor-pointer py-0 shadow-2xl hover:shadow-3xl"
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
          >
            <CardContent className="!p-4">
              <div className="flex items-center justify-center gap-2 bg-amber-200 rounded-md size-7">
                <IconBrandStackshare className="size-4" />
              </div>

              <div className="mt-8 font-semibold text-sm">{template.name}</div>
              <div className="mt-2 text-muted-foreground text-xs line-clamp-2">
                {template.description}
              </div>

              <div className="mt-4">
                <Badge variant="secondary" className="text-xs">
                  Template
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
