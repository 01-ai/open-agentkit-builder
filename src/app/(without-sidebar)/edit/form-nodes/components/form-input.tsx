import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as React from 'react'

interface FormInputProps extends React.ComponentProps<typeof Input> {
  onValueChange?: (value: string) => void
  label?: React.ReactNode
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, onValueChange, onChange, label, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onValueChange?.(e.target.value)
    }

    const inputElement = (
      <Input
        ref={ref}
        className={cn(
          'h-7 bg-primary/10 !ring-0 rounded-md border-none px-2.5 py-0',
          className
        )}
        onChange={handleChange}
        maxLength={64}
        {...props}
      />
    )

    if (!label) {
      return <div>{inputElement}</div>
    }

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <label className="flex-shrink-0 min-w-15 my-1.25 text-sm">
            {label}
          </label>
        </div>
        <div className="flex-1">{inputElement}</div>
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export { FormInput, type FormInputProps }
