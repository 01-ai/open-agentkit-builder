import {
  Workflow,
  WorkflowCreateResponse,
  WorkflowDetail,
} from '@/types/workflow'
import { SessionInfo, Template } from '../types'
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

// Get current authenticated user info
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // axios interceptor returns data.data directly
    const user = await axiosInstance.get('/auth/me', {
      params: {
        return_url: window.location.href,
      },
    })
    return user as unknown as User
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    return null
  }
}

// Get GitHub OAuth authorization URL
export const getGithubAuthUrl = async (): Promise<string | null> => {
  try {
    const response = await axiosInstance.get<{ authUrl: string }>(
      '/auth/github/authorize'
    )
    return (response as unknown as { authUrl: string }).authUrl || null
  } catch (error) {
    console.error('Failed to get GitHub auth URL:', error)
    return null
  }
}

// Logout user
export const logout = async (): Promise<boolean> => {
  try {
    await axiosInstance.get('/auth/logout', {
      params: {
        redirect_url: window.location.href,
      },
    })

    // Clear sb-access-token cookie set on .lingyiwanwu.com domain
    // The cookie was set with: domain=.lingyiwanwu.com, path=/
    document.cookie =
      'sb-access-token=; path=/; domain=.lingyiwanwu.com; expires=Thu, 01 Jan 1970 00:00:00 UTC;'

    return true
  } catch (error) {
    console.error('Failed to logout:', error)
    return false
  }
}

export const getPresignedUrl = (template_id: string) => {
  return axiosInstance.get('/template/code/presigned-url', {
    params: {
      template_id,
    },
  }) as Promise<string>
}

export const getTemplates = () => {
  return axiosInstance.get('/template') as Promise<Template[]>
}

export const createTemplate = (data: Template) => {
  return axiosInstance.post('/template', data)
}

export const deleteTemplate = (template_id: string) => {
  return axiosInstance.delete(`/template/${template_id}`)
}

export const getPrebuiltTemplates = () => {
  return axiosInstance.get('/template/prebuilt') as Promise<Template[]>
}

export const deployTemplate = (template_id: string) => {
  return axiosInstance.post(
    `/deploy/build-and-deploy/${template_id}`
  ) as Promise<DeployStatus>
}

interface DeployStatus {
  template_id: string
  status: 'in_progress' | 'completed' | 'failed'
  accessible_url: string
  create_time: string
  update_time: string
}

export const getDeployStatus = (template_id: string) => {
  return axiosInstance.get(
    `/deploy/deploy-status/${template_id}`
  ) as Promise<DeployStatus>
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

export const getSession = (ticket: string) => {
  return axiosInstance.get(
    `/auth/session?ticket=${ticket}`
  ) as Promise<SessionInfo>
}
