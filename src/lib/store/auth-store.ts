import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getCurrentUser, getSession, logout } from '../services'
import { User } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  setIsLoading: (isLoading: boolean) => void
  setIsInitialized: (isInitialized: boolean) => void
  fetchUser: () => Promise<void>
  logout: () => void
}

// Helper function to extract ticket from URL
const getTicketFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('ticket')
}

// Helper function to get token from localStorage
const getTokenFromStorage = (): string | null => {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem('access_token')
}

// Helper function to clear token from localStorage
const clearToken = (): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('access_token')
  }
  if (typeof window !== 'undefined') {
    document.cookie =
      'sb-access-token=; path=/; domain=.lingyiwanwu.com; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
  }
}

export const useAuthStore = create<AuthState, [['zustand/devtools', never]]>(
  devtools((set, get) => ({
    user: null,
    isLoading: false,
    isInitialized: false,

    setUser: (user) => set({ user }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsInitialized: (isInitialized) => set({ isInitialized }),

    fetchUser: async () => {
      set({ isLoading: true })
      try {
        let token = getTokenFromStorage()
        const ticket = getTicketFromUrl()

        // Step 1: If ticket exists in URL, exchange it for token
        if (ticket) {
          try {
            const response = await getSession(ticket)
            if (response.access_token) {
              token = response.access_token
              localStorage.setItem('access_token', token!)
              // Remove ticket from URL after successful exchange
              window.history.replaceState({}, '', window.location.pathname)
            }
          } catch (error) {
            console.error('Failed to exchange ticket for token:', error)
            token = null
          } finally {
            set({ isLoading: false })
          }
        }

        // Step 2: If token exists, try to fetch user information
        if (token) {
          try {
            const user = await getCurrentUser()
            set({ user, isInitialized: true })
          } catch (error) {
            console.error('Failed to fetch user:', error)
            // Clear token if user fetch fails
            clearToken()
            set({ user: null, isInitialized: true })
          } finally {
            set({ isLoading: false })
          }
        } else {
          // Step 3: No token available, mark user as not logged in
          set({ user: null, isInitialized: true, isLoading: false })
        }
      } catch (error) {
        console.error('Error in fetchUser:', error)
        set({ user: null, isInitialized: true })
      } finally {
        set({ isLoading: false })
      }
    },

    logout: async () => {
      await logout()
      clearToken()
      set({ user: null })
    },
  }))
)
