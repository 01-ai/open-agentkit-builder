import { LoginResponse, SessionInfo, User } from '../types'
import axiosInstance from './axios'

// Get current authenticated user info
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // axios interceptor returns data.data directly
    const user = await axiosInstance.get('/auth/me')
    return user as unknown as User
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    return null
  }
}

// Logout user
export const logout = async (): Promise<boolean> => {
  try {
    await axiosInstance.get('/auth/logout')
    return true
  } catch (error) {
    console.error('Failed to logout:', error)
    return false
  }
}

export const getSession = (ticket: string) => {
  return axiosInstance.get(
    `/auth/session?ticket=${ticket}`
  ) as Promise<SessionInfo>
}

export const login = () => {
  return axiosInstance.get(`/auth/login`, {
    params: {
      return_url: window.location.href,
    },
  }) as Promise<LoginResponse>
}
