'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

// --- Main Context --- //

interface TagsInputContextValue {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  inputValue: string
  setInputValue: (value: string) => void
  selectedTagIndex: number | null
  setSelectedTagIndex: (index: number | null) => void
  handleAddTag: () => void
  handleRemoveTag: (tagToRemove: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const TagsInputContext = React.createContext<TagsInputContextValue | null>(null)

function useTagsInput() {
  const context = React.useContext(TagsInputContext)
  if (!context) {
    throw new Error('useTagsInput must be used within a TagsInputProvider')
  }
  return context
}

// --- Item Context --- //

const TagsInputItemContext = React.createContext<string | null>(null)

function useTagsInputItem() {
  const context = React.useContext(TagsInputItemContext)
  if (!context) {
    throw new Error(
      'useTagsInputItem must be used within a TagsInputItemProvider'
    )
  }
  return context
}

// --- Main Component --- //

const tagsInputVariants = cva(
  'flex flex-wrap gap-2 items-center rounded-md border border-input bg-background px-3 py-2 text-sm'
)

interface TagsInputProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagsInputVariants> {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

const TagsInput = React.forwardRef<HTMLDivElement, TagsInputProps>(
  ({ className, value, onChange, placeholder, children, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState('')
    const [selectedTagIndex, setSelectedTagIndex] = React.useState<
      number | null
    >(null)

    const handleAddTag = () => {
      const newTag = inputValue.trim()
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag])
        setInputValue('')
      }
    }

    const handleRemoveTag = (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove))
      setSelectedTagIndex(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleAddTag()
        return
      }

      if (e.key === 'Backspace' && inputValue === '') {
        if (selectedTagIndex !== null) {
          handleRemoveTag(value[selectedTagIndex])
        } else {
          setSelectedTagIndex(value.length - 1)
        }
        return
      }

      if (e.key === 'ArrowLeft') {
        if (selectedTagIndex === null) {
          setSelectedTagIndex(value.length - 1)
        } else if (selectedTagIndex > 0) {
          setSelectedTagIndex(selectedTagIndex - 1)
        }
        return
      }

      if (e.key === 'ArrowRight') {
        if (selectedTagIndex !== null) {
          if (selectedTagIndex === value.length - 1) {
            setSelectedTagIndex(null)
          } else {
            setSelectedTagIndex(selectedTagIndex + 1)
          }
        }
        return
      }
    }

    const contextValue: TagsInputContextValue = {
      value,
      onChange,
      placeholder,
      inputValue,
      setInputValue,
      selectedTagIndex,
      setSelectedTagIndex,
      handleAddTag,
      handleRemoveTag,
      handleKeyDown,
    }

    return (
      <TagsInputContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(tagsInputVariants(), className)}
          {...props}
        >
          {children}
        </div>
      </TagsInputContext.Provider>
    )
  }
)
TagsInput.displayName = 'TagsInput'

// --- Primitive Components --- //

const tagsInputItemVariants = cva(
  'flex h-6 items-center rounded bg-secondary data-[state=active]:ring-ring data-[state=active]:ring-2 data-[state=active]:ring-offset-2 ring-offset-background'
)

const TagsInputItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const { selectedTagIndex, setSelectedTagIndex } = useTagsInput()
  const index = useTagsInput().value.indexOf(value)

  return (
    <TagsInputItemContext.Provider value={value}>
      <div
        ref={ref}
        className={cn(tagsInputItemVariants(), className)}
        data-state={selectedTagIndex === index ? 'active' : 'inactive'}
        onClick={() => setSelectedTagIndex(index)}
        {...props}
      >
        {children}
      </div>
    </TagsInputItemContext.Provider>
  )
})
TagsInputItem.displayName = 'TagsInputItem'

const TagsInputItemText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const itemValue = useTagsInputItem()
  return (
    <span
      ref={ref}
      className={cn('py-1 px-2 text-sm rounded bg-transparent', className)}
      {...props}
    >
      {itemValue}
    </span>
  )
})
TagsInputItemText.displayName = 'TagsInputItemText'

const TagsInputItemDelete = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const itemValue = useTagsInputItem()
  const { handleRemoveTag } = useTagsInput()

  return (
    <button
      ref={ref}
      type="button"
      className={cn('flex rounded bg-transparent mr-1', className)}
      onClick={() => handleRemoveTag(itemValue)}
      {...props}
    >
      <X className="w-4 h-4" />
    </button>
  )
})
TagsInputItemDelete.displayName = 'TagsInputItemDelete'

const TagsInputInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const {
    inputValue,
    setInputValue,
    handleKeyDown,
    setSelectedTagIndex,
    placeholder,
    handleAddTag,
  } = useTagsInput()

  return (
    <input
      ref={ref}
      className={cn(
        'text-sm min-h-6 focus:outline-none flex-1 bg-transparent px-1',
        className
      )}
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value)
        setSelectedTagIndex(null)
      }}
      onKeyDown={handleKeyDown}
      onBlur={handleAddTag}
      placeholder={placeholder}
      {...props}
    />
  )
})
TagsInputInput.displayName = 'TagsInputInput'

export {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
}
