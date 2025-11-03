# Form Components Template

This directory contains form component wrappers that extend the base UI components with additional form-specific features.

## Design Pattern

All form components follow a consistent pattern:

1. **Inherit base component capabilities** - Using `React.ComponentProps<typeof BaseComponent>`
2. **Add custom props** - Extended interface with form-specific props
3. **Forward refs** - Using `React.forwardRef` for proper ref handling
4. **Style customization** - Via `className` and `containerClassName`
5. **Additional behavior** - Via custom event handlers like `onValueChange`
6. **Accessibility** - Proper ARIA attributes and semantic HTML

## Available Components

- `FormInput` - Enhanced input with label, error, helper text
- `FormTextarea` - Enhanced textarea with character count support

## Usage Examples

### FormInput

```tsx
import { FormInput } from './components/form-input'

// Basic usage
<FormInput
  label="Username"
  placeholder="Enter username"
  required
/>

// With error handling
<FormInput
  label="Email"
  type="email"
  error={errors.email}
  helperText="We'll never share your email"
  required
/>

// With custom behavior
<FormInput
  label="Search"
  onValueChange={(value) => {
    console.log('Value changed:', value)
  }}
/>

// With custom styling
<FormInput
  label="Custom Input"
  className="border-2"
  containerClassName="mb-4"
/>
```

### FormTextarea

```tsx
import { FormTextarea } from './components/form-textarea'

// Basic usage
<FormTextarea
  label="Description"
  placeholder="Enter description"
  required
/>

// With character count
<FormTextarea
  label="Bio"
  showCount
  maxLength={500}
  helperText="Tell us about yourself"
/>

// With error handling
<FormTextarea
  label="Comments"
  error={errors.comments}
  rows={5}
/>
```

## Creating New Form Components

Follow this template to create new form components:

```tsx
import * as React from 'react'
import { BaseComponent } from '@/components/ui/base-component'
import { cn } from '@/lib/utils'

/**
 * Extended props for FormComponent
 */
interface FormComponentProps
  extends React.ComponentProps<typeof BaseComponent> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  containerClassName?: string
  onValueChange?: (value: YourValueType) => void
  // Add your custom props here
}

/**
 * FormComponent
 *
 * Description of your component
 */
const FormComponent = React.forwardRef<HTMLElementType, FormComponentProps>(
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
    // Your custom logic here

    const handleChange = (e: React.ChangeEvent<HTMLElementType>) => {
      onChange?.(e)
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

        {/* Base Component */}
        <BaseComponent
          ref={ref}
          className={cn(
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

FormComponent.displayName = 'FormComponent'

export { FormComponent, type FormComponentProps }
```

## Common Props

All form components support these common props:

| Prop                 | Type                 | Description                                |
| -------------------- | -------------------- | ------------------------------------------ |
| `label`              | `string`             | Label text for the component               |
| `error`              | `string`             | Error message to display                   |
| `helperText`         | `string`             | Helper text to display below the component |
| `required`           | `boolean`            | Whether to show required indicator         |
| `containerClassName` | `string`             | Custom className for the wrapper div       |
| `onValueChange`      | `(value: T) => void` | Callback when value changes                |

## Best Practices

1. **Always forward refs** - Use `React.forwardRef` for proper ref handling
2. **Preserve original behavior** - Call original event handlers before custom ones
3. **Type safety** - Export prop types for better DX
4. **Accessibility** - Use proper ARIA attributes
5. **Consistent styling** - Follow the established pattern
6. **Document props** - Add JSDoc comments for all props
7. **Display name** - Set `displayName` for better debugging

## Future Components

Consider creating:

- `FormButton` - Button with loading state, icons
- `FormSelect` - Select with search, multi-select
- `FormCheckbox` - Checkbox with label and description
- `FormRadioGroup` - Radio group with cards
- `FormSwitch` - Switch with label and description
- `FormDatePicker` - Date picker with validation
- `FormFileUpload` - File upload with preview
