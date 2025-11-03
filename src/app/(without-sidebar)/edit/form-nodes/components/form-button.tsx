import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VariantProps } from 'class-variance-authority'
import * as React from 'react'

interface FormButtonProps extends React.ComponentProps<typeof Button> {
  variant?: VariantProps<typeof buttonVariants>['variant']
}

const FormButton = React.forwardRef<HTMLButtonElement, FormButtonProps>(
  ({ className, variant = 'secondary', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn(
          'h-6.75 text-sm cursor-pointer rounded-full gap-1',
          variant === 'secondary' && 'bg-primary/10 hover:bg-primary/15',
          className
        )}
        {...props}
      />
    )
  }
)

FormButton.displayName = 'FormButton'

export { FormButton, type FormButtonProps }
