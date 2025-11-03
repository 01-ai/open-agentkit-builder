import { create } from 'zustand'
import { getCurrentUser, getSession, User } from '../services/apis'

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      let user: User | null = null
      const ticket = getTicketFromUrl()

      if (ticket) {
        // If ticket is present in URL, use getSession instead
        try {
          const response = await getSession(ticket)
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token)
            // Remove ticket from URL after successful authentication
            window.history.replaceState({}, '', window.location.pathname)
            user = await getCurrentUser()
          }
        } catch (error) {
          console.error('Failed to get session with ticket:', error)
          // Fallback to regular authentication
          user = await getCurrentUser()
        }
      } else {
        console.log('no ticket')
        // Regular authentication flow
        user = await getCurrentUser()
      }

      set({ user, isInitialized: true })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ user: null, isInitialized: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    set({ user: null })
  },
}))
