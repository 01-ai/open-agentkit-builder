import {
  Workflow,
  WorkflowCreateResponse,
  WorkflowDetail,
} from '@/types/workflow'
import axiosInstance from './axios'

export interface User {
  user_id: string
  email: string
  user_name: string
  create_time: string
  update_time: string
  // Legacy fields for compatibility
  id?: number
  username?: string
  avatar_url?: string
  name?: string
}

export interface LoginResponse {
  token: string
  csrf_token?: string
  user_id?: string
  user: User
}

export const getWorkflows = () => {
  return axiosInstance.get('/workflows') as Promise<WorkflowDetail[]>
}

export const getWorkflow = (workflow_id: string) => {
  return axiosInstance.get(
    `/workflows/${workflow_id}`
  ) as Promise<WorkflowDetail>
}

export const createWorkflow = (data: Workflow) => {
  return axiosInstance.post(
    '/workflows',
    data
  ) as Promise<WorkflowCreateResponse>
}

export const updateWorkflow = (
  workflow_id: string,
  data: Partial<Workflow>
) => {
  return axiosInstance.put(
    `/workflows/${workflow_id}`,
    data
  ) as Promise<WorkflowCreateResponse>
}

export const deleteWorkflow = (workflow_id: string) => {
  return axiosInstance.delete(`/workflows/${workflow_id}`) as Promise<void>
}
