'use client'

import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'

interface FormTagsInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function FormTagsInput({
  value,
  onChange,
  placeholder,
}: FormTagsInputProps) {
  return (
    <TagsInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="p-1.5 gap-1.5 ring ring-input has-[:focus]:ring-primary/50 max-w-[300px] border-none rounded-md min-h-21 flex items-start"
    >
      <div className="flex flex-wrap gap-1.5 w-full">
        {value.map((item) => (
          <TagsInputItem
            key={item}
            value={item}
            className="h-5 rounded-xl bg-builder-background !ring-0 data-[state=active]:bg-primary/20"
          >
            <TagsInputItemText className="pl-2 pr-1" />
            <TagsInputItemDelete />
          </TagsInputItem>
        ))}
        <TagsInputInput className="!h-5 min-h-0" />
      </div>
    </TagsInput>
  )
}
