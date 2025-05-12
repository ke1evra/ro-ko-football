'use client'

import { Button } from '@/components/ui/button'

import { logoutUser } from '@/lib/auth'

export function LogoutButton() {
  return <Button onClick={() => logoutUser()}>Logout</Button>
}
