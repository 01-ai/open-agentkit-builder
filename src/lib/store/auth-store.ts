import { create } from 'zustand'
import { getCurrentUser, User } from '../services/apis'

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
      const user = await getCurrentUser()
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
