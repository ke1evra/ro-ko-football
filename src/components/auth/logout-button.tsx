'use client'

import { logoutUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return <Button onClick={() => logoutUser()}>Logout</Button>
}
