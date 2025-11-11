'use client'

import { Button } from './ui/button'
import { useState } from 'react'
import { Spinner } from './ui/spinner'
import { login } from '@/lib/services'

interface LoginCardProps {
  showBorder?: boolean
}

/**
 * LoginCard component that displays a login prompt as a card
 * Used in both LoginModal and AuthGuard
 */
export function LoginCard({ showBorder = true }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGithubLogin = async () => {
    setIsLoading(true)
    try {
      const res = await login()
      if (res.redirect_url) {
        window.location.href = res.redirect_url
      }
    } catch (error) {
      console.error('Failed to get GitHub auth URL:', error)
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`bg-card ${showBorder ? 'border border-border rounded-lg shadow-lg' : ''} p-8`}
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
        <p className="text-muted-foreground text-sm">
          Please sign in with your GitHub account to view this content
        </p>
      </div>

      <Button
        onClick={handleGithubLogin}
        disabled={isLoading}
        className="w-full font-semibold py-6 transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Spinner className="w-4 h-4" />
            Loading...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.545 2.914 1.209.092-.937.35-1.546.636-1.903-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.270.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.195 22 16.440 22 12.017 22 6.484 17.523 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with GitHub
          </>
        )}
      </Button>
    </div>
  )
}
