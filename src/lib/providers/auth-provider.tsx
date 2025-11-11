'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { useEffect } from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized, isLoading, fetchUser } = useAuthStore()

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      fetchUser()
    }
  }, [isInitialized, isLoading, fetchUser])

  return <>{children}</>
}
