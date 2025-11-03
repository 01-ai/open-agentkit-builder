'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

interface FormSelectProps
  extends React.ComponentPropsWithoutRef<typeof Select> {
  label?: React.ReactNode
  children: React.ReactNode
}

const FormSelect = React.forwardRef<
  React.ElementRef<typeof Select>,
  FormSelectProps
>(({ label, children, ...props }, ref) => {
  const selectElement = <Select {...props}>{children}</Select>

  if (!label) {
    return selectElement
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-baseline gap-1">
        <label className="flex-shrink-0 min-w-15 my-1.25 text-sm">
          {label}
        </label>
      </div>
      <div className="flex-1">{selectElement}</div>
    </div>
  )
})
FormSelect.displayName = 'FormSelect'

const FormSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ className, children, ...props }, ref) => (
  <SelectTrigger
    ref={ref}
    className={cn(
      'bg-primary/10 !ring-0 rounded-md border-none px-2.5 py-1 !h-7 w-full text-sm',
      className
    )}
    icon={<ChevronsUpDown className="size-4 opacity-50" />}
    {...props}
  >
    {children}
  </SelectTrigger>
))
FormSelectTrigger.displayName = 'FormSelectTrigger'

const FormSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, ...props }, ref) => (
  <SelectContent ref={ref} className={cn(className)} {...props} />
))
FormSelectContent.displayName = 'FormSelectContent'

const FormSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ className, ...props }, ref) => (
  <SelectItem ref={ref} className={cn(className)} {...props} />
))
FormSelectItem.displayName = 'FormSelectItem'

const FormSelectValue = SelectValue

export {
  FormSelect,
  FormSelectContent,
  FormSelectItem,
  FormSelectTrigger,
  FormSelectValue,
}
