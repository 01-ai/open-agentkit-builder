'use client'

import { LoginCard } from './login-card'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * LoginModal component that displays a login dialog modal
 * Used with LoginDialogProvider for modal-based authentication
 */
export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>Sign In Required</DialogTitle>
      <DialogContent className="sm:max-w-md">
        <LoginCard showBorder={false} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * For backwards compatibility
 * @deprecated Use LoginModal instead
 */
export const LoginGuide = LoginModal
