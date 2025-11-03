import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Extended props for FormInput
 * Add any custom props you need here
 */
interface FormInputProps extends React.ComponentProps<typeof Input> {
  /**
   * Label text for the input
   */
  label?: string
  /**
   * Error message to display
   */
  error?: string
  /**
   * Helper text to display below the input
   */
  helperText?: string
  /**
   * Whether to show required indicator
   */
  required?: boolean
  /**
   * Custom container className
   */
  containerClassName?: string
  /**
   * Custom wrapper for additional behavior
   */
  onValueChange?: (value: string) => void
}

/**
 * FormInput Component
 *
 * A wrapper around the base Input component with additional form-specific features.
 * This serves as a template for other form-* components (form-button, form-textarea, etc.)
 *
 * Features:
 * - Inherits all Input component capabilities
 * - Adds label, error, helper text support
 * - Customizable styling via className and containerClassName
 * - Additional behavior via onValueChange
 * - Full TypeScript support with ref forwarding
 *
 * @example
 * ```tsx
 * <FormInput
 *   label="Username"
 *   placeholder="Enter username"
 *   error={errors.username}
 *   required
 *   onValueChange={(value) => console.log(value)}
 * />
 * ```
 */
const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      onValueChange,
      onChange,
      ...props
    },
    ref
  ) => {
    // Handle onChange with custom behavior
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Call original onChange if provided
      onChange?.(e)

      // Call custom onValueChange if provided
      onValueChange?.(e.target.value)
    }

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
        )}

        {/* Input */}
        <Input
          ref={ref}
          className={cn(
            // Add your custom styles here
            // These will be merged with the base Input styles
            error && 'border-destructive focus-visible:ring-destructive/20',
            className
          )}
          aria-invalid={!!error}
          aria-required={required}
          onChange={handleChange}
          {...props}
        />

        {/* Error Message */}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export { FormInput, type FormInputProps }
