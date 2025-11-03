import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Trash2Icon } from 'lucide-react'
import * as React from 'react'
interface FormRemoveButtonProps extends React.ComponentProps<typeof Button> {
  onClick: () => void
}

const FormRemoveButton = React.forwardRef<
  HTMLButtonElement,
  FormRemoveButtonProps
>(({ className, onClick, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        'w-8 h-6 text-sm text-primary/80 hover:text-primary hover:bg-primary/10',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <Trash2Icon className="size-3.5" />
    </Button>
  )
})

FormRemoveButton.displayName = 'FormRemoveButton'

export { FormRemoveButton, type FormRemoveButtonProps }
