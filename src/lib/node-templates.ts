/**
 * 节点模板定义
 */

import { NodeTemplate } from '@/types/workflow'

export const nodeTemplates: NodeTemplate[] = [
  {
    type: 'start',
    label: '开始',
    description: '工作流的起点',
    icon: '🎬',
    defaultConfig: {},
  },
  {
    type: 'llm',
    label: 'LLM 调用',
    description: '调用大语言模型',
    icon: '🤖',
    defaultConfig: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
  },
  {
    type: 'condition',
    label: '条件判断',
    description: '根据条件分支执行',
    icon: '🔀',
    defaultConfig: {
      conditions: [],
    },
  },
  {
    type: 'loop',
    label: '循环',
    description: '重复执行某些操作',
    icon: '🔄',
    defaultConfig: {
      maxIterations: 10,
    },
  },
  {
    type: 'approval',
    label: '用户审批',
    description: '等待用户确认',
    icon: '✋',
    defaultConfig: {
      timeout: 3600,
    },
  },
  {
    type: 'retrieval',
    label: '文件检索',
    description: '检索相关文档',
    icon: '🔍',
    defaultConfig: {
      topK: 5,
    },
  },
  {
    type: 'transform',
    label: '数据转换',
    description: '转换数据格式',
    icon: '⚙️',
    defaultConfig: {},
  },
  {
    type: 'end',
    label: '结束',
    description: '工作流的终点',
    icon: '🏁',
    defaultConfig: {},
  },
]

export function getNodeTemplate(type: string): NodeTemplate | undefined {
  return nodeTemplates.find((t) => t.type === type)
}
