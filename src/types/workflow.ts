/**
 * 工作流节点类型定义
 */
export type NodeType =
  | 'start' // 开始节点
  | 'llm' // LLM 调用节点
  | 'condition' // 条件判断节点
  | 'loop' // 循环节点
  | 'approval' // 用户审批节点
  | 'retrieval' // 文件检索节点
  | 'transform' // 数据转换节点
  | 'end' // 结束节点

/**
 * 工作流节点数据
 */
export interface WorkflowNodeData {
  label: string
  description?: string
  config?: Record<string, any>
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: WorkflowNodeData
}

/**
 * 工作流边（连接线）
 */
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
}

/**
 * 工作流定义
 */
export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

/**
 * 节点配置模板
 */
export interface NodeTemplate {
  type: NodeType
  label: string
  description: string
  icon: string
  defaultConfig?: Record<string, any>
}
