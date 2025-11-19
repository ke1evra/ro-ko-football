'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

import { clearAuthCookies } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)

    try {
      const result = await clearAuthCookies()

      if (result.success) {
        toast.success('Выход выполнен успешно', {
          description: 'Вы вышли из своего аккаунта.',
        })
        router.push('/')
        router.refresh() // Refresh to clear any cached user state
      } else {
        toast.error('Выход не удался', {
          description: 'Попробуйте снова.',
        })
      }
    } catch (_error) {
      toast.error('Выход не удался', {
        description: 'Попробуйте снова.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Выход...' : 'Выйти'}
    </Button>
  )
}

export const LogoutIconButton = () => {
  const router = useRouter()

  const handleLogout = async () => {
    await clearAuthCookies()
  }

  return (
    <Button variant="outline" size="icon" onClick={handleLogout}>
      <LogOut />
    </Button>
  )
}
