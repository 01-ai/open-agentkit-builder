'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { useEffect } from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const isInitialized = useAuthStore((state) => state.isInitialized)

  useEffect(() => {
    if (!isInitialized) {
      fetchUser()
    }
  }, [isInitialized, fetchUser])

  return <>{children}</>
}
