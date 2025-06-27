'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

import { logoutUser } from '@/lib/auth'

export function LogoutButton() {
  const handleLogout = () => {
    toast.success('Logged out successfully', {
      description: 'You have been signed out of your account.',
    })
    logoutUser()
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Logout
    </Button>
  )
}
