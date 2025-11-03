'use client'

import { useCanvas } from '@/app/(without-sidebar)/edit/canvas/canvas-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigComponentProps } from '@/lib/nodes/types'
import { setNestedValue } from '@/lib/utils/path-utils'
import { Braces, Globe, Plus, SquareFunction, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DialogSchemaJSON } from './components/dialog-schema-json'
import { DialogToolsJSON } from './components/dialog-tools-json'
import { FormInput } from './components/form-input'
import {
  FormSelect,
  FormSelectContent,
  FormSelectTrigger,
  FormSelectValue,
} from './components/form-select'
import { FormTextarea } from './components/form-textarea'

/**
 * Agent Node Configuration Component
 */
export function AgentConfig({
  nodeId,
  config,
  onChange,
}: ConfigComponentProps) {
  const { getNode, updateNodeLabel } = useCanvas()

  // Helper function to update nested config fields
  const updateField = (path: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config)) // Deep clone
    setNestedValue(newConfig, path, value)
    onChange(newConfig)
  }

  // Helper function to delete nested config fields
  const removeArrayItem = (path: string, index: number) => {
    const newConfig = JSON.parse(JSON.stringify(config)) // Deep clone
    const pathParts = path.split('.')
    let current = newConfig

    // 导航到数组所在的对象
    for (let i = 0; i < pathParts.length; i++) {
      if (i === pathParts.length - 1) {
        // 最后一个部分是数组名，执行删除操作
        if (Array.isArray(current[pathParts[i]])) {
          current[pathParts[i]].splice(index, 1)
        }
      } else {
        current = current[pathParts[i]]
      }
    }

    onChange(newConfig)
  }

  // node label
  const nodeLabel = useMemo(() => {
    return getNode(nodeId)?.data?.label || ''
  }, [getNode, nodeId])

  // 增加message
  const addMessage = () => {
    const newMessage = {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '',
        },
      ],
    }

    updateField('messages', [...(config.messages || []), newMessage])
  }

  // Function editor dialog state
  const [isDialogToolsFunc, setIsDialogToolsFunc] = useState(false)
  const [toolsIndex, setToolsIndex] = useState(-1)
  const [toolsJsonCode, setToolsJsonCode] = useState('')
  const [isWebSearchMode, setIsWebSearchMode] = useState(false)

  // 清空function dialog配置
  useEffect(() => {
    if (!isDialogToolsFunc) {
      setToolsJsonCode('')
      setToolsIndex(-1)
      setIsWebSearchMode(false)
    }
  }, [isDialogToolsFunc])

  // output json editor dialog state
  const [isDialogOutputJson, setIsDialogOutputJson] = useState(false)
  const [outputJson, setOutputJson] = useState('')

  // 获取output json初始数据
  useEffect(() => {
    if (config?.text?.format?.schema) {
      setOutputJson(JSON.stringify(config.text.format.schema, null, 2))
    }
  }, [config?.text?.format?.schema])

  // 检查是否已存在 web_search 工具
  const hasWebSearch = useMemo(() => {
    return config.tools?.some((tool: any) => tool.type === 'web_search')
  }, [config.tools])

  // 添加 Web Search 工具
  const addWebSearch = () => {
    const defaultWebSearch = {
      type: 'web_search',
      search_context_size: 'medium',
      user_location: {
        type: 'approximate',
      },
    }

    setToolsJsonCode(JSON.stringify(defaultWebSearch, null, 2))
    setToolsIndex(-1)
    setIsWebSearchMode(true)
    setIsDialogToolsFunc(true)
  }

  // 添加 Function 工具
  const addFunction = () => {
    setToolsJsonCode('')
    setToolsIndex(-1)
    setIsWebSearchMode(false)
    setIsDialogToolsFunc(true)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Name */}
      <FormInput
        label="Name"
        value={nodeLabel as string}
        onValueChange={(value: string) => updateNodeLabel?.(nodeId, value)}
        placeholder="Agent"
      />

      {/* Instructions */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 justify-between">
            <Label className="leading-8">Instructions</Label>
            <Button size="icon-sm" variant="ghost" onClick={addMessage}>
              <Plus />
            </Button>
          </div>

          <FormTextarea
            value={config.instructions?.expression || ''}
            onValueChange={(e) => updateField('instructions.expression', e)}
            serialized
            placeholder="Describe desired model behavior (tone, tool usage, response style)"
          />
        </div>

        {config.messages?.map((message: any, index: number) => (
          <div key={index} className="flex flex-col rounded-lg bg-primary/10">
            <div className="flex items-center gap-2 justify-between">
              <FormSelect
                value={message?.role || 'user'}
                onValueChange={(v) => {
                  const newConfig = JSON.parse(JSON.stringify(config)) // Deep clone

                  // 更新 role 字段
                  setNestedValue(newConfig, `messages.${index}.role`, v)

                  // 根据 role 更新 content type
                  if (v === 'user') {
                    setNestedValue(
                      newConfig,
                      `messages.${index}.content.0.type`,
                      'input_text'
                    )
                  } else if (v === 'assistant') {
                    setNestedValue(
                      newConfig,
                      `messages.${index}.content.0.type`,
                      'output_text'
                    )
                  }

                  // 一次性更新整个配置
                  onChange(newConfig)
                }}
              >
                <FormSelectTrigger className="border-0 shadow-none bg-transparent w-fit">
                  <FormSelectValue placeholder="Select a value" />
                </FormSelectTrigger>
                <FormSelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                </FormSelectContent>
              </FormSelect>

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => removeArrayItem('messages', index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FormTextarea
              value={message?.content?.[0]?.text || ''}
              onValueChange={(value: string) =>
                updateField(`messages.${index}.content.0.text`, value)
              }
              placeholder="Enter user message, use {{ curly braces }} to insert variables."
              rows={3}
              className="bg-transparent"
            />
          </div>
        ))}
      </div>

      {/* tools */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 justify-between">
          <Label>Tools</Label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Hosted Tools - 只在有 Web Search 选项时显示 */}
              {!hasWebSearch && (
                <>
                  <DropdownMenuLabel>Hosted</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={addWebSearch}>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Web Search</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}

              {/* Local Tools */}
              <DropdownMenuLabel>Local</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={addFunction}>
                  <SquareFunction className="mr-2 h-4 w-4" />
                  <span>Function</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {config.tools?.map((tool: any, index: number) => {
            const isWebSearch = tool.type === 'web_search'
            const icon = isWebSearch ? <Globe /> : <SquareFunction />
            const displayName = isWebSearch ? 'Web Search' : tool?.name || '--'

            return (
              <Button
                key={index}
                size="sm"
                variant="secondary"
                onClick={() => {
                  setToolsJsonCode(JSON.stringify(tool, null, 2))
                  setToolsIndex(index)
                  setIsWebSearchMode(tool.type === 'web_search')
                  setIsDialogToolsFunc(true)
                }}
              >
                {icon}
                <span>{displayName}</span>
                <div
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    removeArrayItem('tools', index)
                  }}
                >
                  <X className="h-4 w-4" />
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Output Format */}
      <div>
        <div className="flex items-center gap-2 justify-between">
          <Label>Output format</Label>
          <Select
            value={config.text?.format?.type || 'text'}
            onValueChange={(v) => {
              updateField('text.format.type', v)
            }}
          >
            <SelectTrigger className="border-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json_schema">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.text?.format?.type === 'json_schema' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsDialogOutputJson(true)
            }}
          >
            {config.text?.format?.schema && (
              <>
                <Braces />
                <span>{config.text?.format?.name || '--'}</span>
              </>
            )}
            {!config.text?.format?.schema && (
              <>
                <Plus />
                <span>Add schema</span>
              </>
            )}
          </Button>
        )}
      </div>

      <DialogToolsJSON
        open={isDialogToolsFunc}
        onOpenChange={setIsDialogToolsFunc}
        onSave={(value, index) => {
          updateField(`tools.${index}`, value)
        }}
        onAdd={(value) => {
          updateField('tools', [...(config.tools || []), value])
        }}
        onDelete={(index) => {
          removeArrayItem('tools', index)
        }}
        index={toolsIndex}
        initialValue={toolsJsonCode}
        isWebSearchMode={isWebSearchMode}
      />

      <DialogSchemaJSON
        type="agent"
        open={isDialogOutputJson}
        onOpenChange={setIsDialogOutputJson}
        initialValue={outputJson}
        onUpdate={(value) => {
          const schema = JSON.parse(value)

          // 构建完整的 format 对象并一次性更新
          const formatUpdate = {
            ...config.text?.format, // 保留原有的 format 属性
            schema,
          }

          // 如果 value.title 存在，则更新 name 字段
          if (schema?.title) {
            formatUpdate.name = schema.title
          }

          updateField('text.format', formatUpdate)
        }}
      />
    </div>
  )
}
