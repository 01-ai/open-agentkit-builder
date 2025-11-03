'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// 动态导入 Monaco Editor 以避免 SSR 问题
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
})

interface DialogSchemaJSONProps {
  type?: string
  open: boolean
  initialValue?: string
  onOpenChange: (open: boolean) => void
  onUpdate: (value: any) => void
}

const initCode = (type: string) => {
  let jsonCode = ''
  switch (type) {
    case 'agent':
      jsonCode = `{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "required": [],
  "title": "response_schema"
}`
      break
    case 'end':
      jsonCode = `{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "required": [],
  "title": "WorkflowOutput"
}`
      break
    default:
      jsonCode = `{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "required": []
}`
      break
  }
  return jsonCode
}

export function DialogSchemaJSON({
  type = '',
  open,
  initialValue = '',
  onOpenChange,
  onUpdate,
}: DialogSchemaJSONProps) {
  const [code, setCode] = useState(initCode(type))
  const editorRef = useRef<any>(null)

  useEffect(() => {
    if (initialValue) {
      setCode(initialValue)
    }
  }, [initialValue])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    // 确保编辑器获得焦点
    editor.focus()

    // 注册Cmd+V快捷键（使用null作为条件，避免覆盖默认行为）
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      async () => {
        try {
          const text = await navigator.clipboard.readText()
          const selection = editor.getSelection()
          editor.executeEdits('', [
            {
              range: selection,
              text: text,
            },
          ])
        } catch (err) {
          console.warn('无法读取剪贴板内容:', err)
        }
      },
      '' // 添加空字符串作为条件，避免覆盖默认快捷键
    )
  }

  const handleUpdate = () => {
    const text = code.trim()

    // Check if empty or only whitespace
    if (!text) {
      toast.error('JSON schema cannot be empty')
      return
    }

    // Validate JSON format
    try {
      const parsed = JSON.parse(text)

      // Validate that it's an object (not array, string, number, etc.)
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        toast.error('JSON schema must be a valid object')
        return
      }

      onUpdate(text)
      onOpenChange(false)
    } catch (err) {
      console.error('JSON parse error:', err)
      toast.error('Invalid JSON format. Please check your syntax.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[700px] min-w-[700px] max-w-[700px] max-h-[80vh] flex flex-col"
        onOpenAutoFocus={(e) => {
          // 阻止 Dialog 的默认焦点管理，让编辑器自己处理
          e.preventDefault()
          // 延迟一帧让编辑器先挂载，然后聚焦
          setTimeout(() => {
            editorRef.current?.focus()
          }, 0)
        }}
        onKeyDown={(e) => {
          // 只允许 Escape 键关闭对话框，其他所有键都不要冒泡
          if (e.key !== 'Escape') {
            e.stopPropagation()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{'Structured output (JSON)'}</DialogTitle>
          <DialogDescription>
            The model will generate a JSON object that matches this schema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 gap-2">
          <div className="rounded-md border overflow-hidden">
            <div
              className="p-1"
              onKeyDown={(e) => {
                // 阻止空格键事件冒泡到 Dialog，避免被拦截
                if (e.key === ' ' || e.code === 'Space') {
                  e.stopPropagation()
                }
              }}
            >
              <MonacoEditor
                height="400px"
                defaultLanguage="json"
                value={code}
                onChange={(value) => {
                  setCode(value || '')
                }}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{
                  fontSize: 13,
                  lineNumbers: 'off',
                  folding: false,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  overviewRulerLanes: 0,
                  renderLineHighlight: 'none',
                  contextmenu: true,
                  scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                  smoothScrolling: true,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", "Courier New", monospace',
                  placeholder: '',
                  readOnly: false,
                  domReadOnly: false,
                  tabCompletion: 'on',
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnCommitCharacter: true,
                  // 确保快捷键提示不会阻止空格输入
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: true,
                  },
                  // 允许空格触发建议后继续输入
                  acceptSuggestionOnEnter: 'on',
                  // 确保所有键盘输入都能正常工作
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center">
          <span></span>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
