import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SettingsIcon } from 'lucide-react'
import * as React from 'react'
interface FormSettingButtonProps extends React.ComponentProps<typeof Button> {
  onClick?: () => void
}

const FormSettingButton = React.forwardRef<
  HTMLButtonElement,
  FormSettingButtonProps
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
      <SettingsIcon className="size-3.5" />
    </Button>
  )
})

FormSettingButton.displayName = 'FormSettingButton'

export { FormSettingButton, type FormSettingButtonProps }
