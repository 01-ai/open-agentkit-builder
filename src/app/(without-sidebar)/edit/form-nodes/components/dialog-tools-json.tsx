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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

// 动态导入 Monaco Editor 以避免 SSR 问题
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
})

interface DialogToolsJSONProps {
  open: boolean
  index: number
  initialValue?: string
  onOpenChange: (open: boolean) => void
  onSave: (value: any, index: number) => void
  onAdd: (value: any) => void
  onDelete: (index: number) => void
  isWebSearchMode?: boolean
}

export function DialogToolsJSON({
  open,
  index = -1,
  initialValue = '',
  onOpenChange,
  onSave,
  onAdd,
  onDelete,
  isWebSearchMode = false,
}: DialogToolsJSONProps) {
  const [code, setCode] = useState('')
  const editorRef = useRef<any>(null)

  useEffect(() => {
    setCode(initialValue)
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

  const handleCodeChange = (value?: string) => {
    const text = value || ''

    try {
      const parsed = JSON.parse(text)
      return parsed
    } catch (err) {
      throw err
    }
  }

  const setWeather = () => {
    setCode(
      JSON.stringify(
        {
          name: 'get_weather',
          description: 'Determine weather in my location',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state e.g. San Francisco, CA',
              },
              unit: {
                type: 'string',
                enum: ['c', 'f'],
              },
            },
            additionalProperties: false,
            required: ['location', 'unit'],
          },
        },
        null,
        2
      )
    )
  }

  const setStockPrice = () => {
    setCode(
      JSON.stringify(
        {
          name: 'get_stock_price',
          description: 'Get the current stock price',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The stock symbol',
              },
            },
            additionalProperties: false,
            required: ['symbol'],
          },
        },
        null,
        2
      )
    )
  }

  const handleSave = () => {
    onSave(handleCodeChange(code), index)
    onOpenChange(false)
  }

  const handleAdd = () => {
    onAdd(handleCodeChange(code))
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (index > -1) {
      onDelete(index)
    }

    onOpenChange(false)
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
          <DialogTitle>
            {isWebSearchMode ? 'Configure Web Search tool' : 'Edit function'}
          </DialogTitle>
          {!isWebSearchMode && (
            <DialogDescription>
              The model will intelligently decide to call functions based on
              input it receives from the user.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col flex-1 gap-2">
          <div className="flex items-center justify-between">
            <h3>Definition</h3>
            {!isWebSearchMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    Examples <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={setWeather}>
                    {'get_weather()'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={setStockPrice}>
                    {'get_stock_price()'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

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
                onChange={(value) => setCode(value || '')}
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
                  placeholder: isWebSearchMode
                    ? JSON.stringify(
                        {
                          type: 'web_search',
                          search_context_size: 'medium',
                          user_location: {
                            type: 'approximate',
                          },
                        },
                        null,
                        2
                      )
                    : JSON.stringify(
                        {
                          name: 'get_stock_price',
                          description: 'Get the current stock price',
                          parameters: {
                            type: 'object',
                            properties: {
                              symbol: {
                                type: 'string',
                                description: 'The stock symbol',
                              },
                            },
                            additionalProperties: false,
                            required: ['symbol'],
                          },
                        },
                        null,
                        2
                      ),
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

            {!isWebSearchMode && (
              <div className="flex p-3 bg-gray-100 dark:bg-gray-800 text-sm items-center">
                Add
                <code className="bg-gray-200 dark:bg-gray-700 px-1 mx-1 rounded text-xs font-mono border border-gray-300 dark:border-gray-600">
                  {'"strict": true'}
                </code>
                to ensure the model&apos;s response always follows this schema.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center">
          {index > -1 ? (
            <Button size="icon" variant="secondary" onClick={handleDelete}>
              <Trash2 />
            </Button>
          ) : (
            <span></span>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {index > -1 && <Button onClick={handleSave}>Save</Button>}
            {index === -1 && <Button onClick={handleAdd}>Add</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
