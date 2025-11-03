import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { ReactNode } from 'react'

interface IconTooltipProps {
  content: ReactNode
  icon?: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function IconTooltip({
  content,
  icon,
  side = 'top',
  align = 'center',
}: IconTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-pointer">
            {icon || <Info className="h-4 w-4 text-muted-foreground" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
