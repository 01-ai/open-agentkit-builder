'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { LoginCard } from './login-card'
import { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * AuthGuard component that protects content from unauthenticated users
 * Displays login prompt if user is not authenticated
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isInitialized } = useAuthStore()

  // Still loading auth state
  if (!isInitialized) {
    return <div className="flex-1 w-full h-full" />
  }

  // User not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="flex-1 w-full flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full">
          <LoginCard />
        </div>
      </div>
    )
  }

  // User is authenticated, show content
  return <>{children}</>
}
