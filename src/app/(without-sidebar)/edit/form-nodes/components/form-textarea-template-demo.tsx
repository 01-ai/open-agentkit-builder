import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Extended props for FormTextarea
 * Add any custom props you need here
 */
interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  /**
   * Label text for the textarea
   */
  label?: string
  /**
   * Error message to display
   */
  error?: string
  /**
   * Helper text to display below the textarea
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
   * Show character count
   */
  showCount?: boolean
  /**
   * Maximum character count
   */
  maxLength?: number
  /**
   * Custom wrapper for additional behavior
   */
  onValueChange?: (value: string) => void
}

/**
 * FormTextarea Component
 *
 * A wrapper around the base Textarea component with additional form-specific features.
 * Based on the same template pattern as FormInput.
 *
 * Features:
 * - Inherits all Textarea component capabilities
 * - Adds label, error, helper text support
 * - Character count display
 * - Customizable styling via className and containerClassName
 * - Additional behavior via onValueChange
 * - Full TypeScript support with ref forwarding
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   label="Description"
 *   placeholder="Enter description"
 *   error={errors.description}
 *   required
 *   showCount
 *   maxLength={500}
 *   onValueChange={(value) => console.log(value)}
 * />
 * ```
 */
const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      showCount,
      maxLength,
      onValueChange,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = React.useState(0)

    // Initialize character count
    React.useEffect(() => {
      const initialValue = (value || defaultValue || '') as string
      setCharCount(initialValue.length)
    }, [value, defaultValue])

    // Handle onChange with custom behavior
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value

      // Update character count
      setCharCount(newValue.length)

      // Call original onChange if provided
      onChange?.(e)

      // Call custom onValueChange if provided
      onValueChange?.(newValue)
    }

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {/* Label with optional character count */}
        {(label || showCount) && (
          <div className="flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-foreground">
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
              </label>
            )}
            {showCount && (
              <span className="text-xs text-muted-foreground">
                {charCount}
                {maxLength && `/${maxLength}`}
              </span>
            )}
          </div>
        )}

        {/* Textarea */}
        <Textarea
          ref={ref}
          className={cn(
            // Add your custom styles here
            // These will be merged with the base Textarea styles
            error && 'border-destructive focus-visible:ring-destructive/20',
            className
          )}
          aria-invalid={!!error}
          aria-required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
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

FormTextarea.displayName = 'FormTextarea'

export { FormTextarea, type FormTextareaProps }
