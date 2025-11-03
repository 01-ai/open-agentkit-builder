import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import * as React from 'react'

interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  onValueChange?: (value: string) => void
  label?: React.ReactNode
  serialized?: boolean // whether the value is serialized JSON
}

// 将普通字符串 => 转为转义形式（保存前）
function encodeForStorage(str: string): string {
  return JSON.stringify(str)
}

// 将转义形式 => 还原成普通字符串（读取后）
function decodeFromStorage(str: string): string {
  try {
    return JSON.parse(str)
  } catch {
    return str // 如果已经是普通字符串，就直接返回
  }
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      className,
      onValueChange,
      onChange,
      value,
      label,
      serialized = false,
      ...props
    },
    ref
  ) => {
    // 处理序列化逻辑：显示时解码，保存时编码
    const stringValue = String(value || '')
    const displayValue =
      serialized && value ? decodeFromStorage(stringValue) : stringValue

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value

      // 如果启用序列化，需要编码后传递给父组件
      const processedValue = serialized ? encodeForStorage(newValue) : newValue

      // 创建新的事件对象，使用处理后的值
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: processedValue,
        },
      }

      onChange?.(syntheticEvent)
      onValueChange?.(processedValue)
    }

    const textareaElement = (
      <Textarea
        ref={ref}
        className={cn(
          'bg-primary/10 !ring-0 rounded-md border-none px-2.5 py-1 min-h-12.5 max-h-[400px] overflow-y-auto text-sm',
          displayValue && 'min-h-7',
          className
        )}
        maxLength={256}
        value={displayValue}
        onChange={handleChange}
        rows={2}
        style={{ resize: 'none' }}
        {...props}
      />
    )

    if (!label) {
      return textareaElement
    }

    return (
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <label className="flex-shrink-0 min-w-15 my-1.25 text-sm">
            {label}
          </label>
        </div>
        {textareaElement}
      </div>
    )
  }
)

FormTextarea.displayName = 'FormTextarea'

export { FormTextarea, type FormTextareaProps }
