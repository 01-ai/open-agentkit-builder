import { cn } from '@/lib/utils'
import * as React from 'react'

interface FormLabelProps {
  children: React.ReactNode
  className?: string
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div className="flex items-baseline gap-1">
        <label
          ref={ref}
          className={cn('flex-shrink-0 min-w-15 my-1.25 text-sm', className)}
          {...props}
        >
          {children}
        </label>
      </div>
    )
  }
)

FormLabel.displayName = 'FormLabel'

export { FormLabel, type FormLabelProps }
