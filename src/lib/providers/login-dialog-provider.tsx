'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { LoginModal } from '@/components/login-modal'

interface LoginDialogContextType {
  showLoginDialog: () => void
  hideLoginDialog: () => void
  isLoginDialogOpen: boolean
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(
  undefined
)

export function LoginDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const showLoginDialog = () => setIsOpen(true)
  const hideLoginDialog = () => setIsOpen(false)

  return (
    <LoginDialogContext.Provider
      value={{
        showLoginDialog,
        hideLoginDialog,
        isLoginDialogOpen: isOpen,
      }}
    >
      {children}
      <LoginModal open={isOpen} onOpenChange={setIsOpen} />
    </LoginDialogContext.Provider>
  )
}

export function useLoginDialog() {
  const context = useContext(LoginDialogContext)
  if (context === undefined) {
    throw new Error('useLoginDialog must be used within LoginDialogProvider')
  }
  return context
}

