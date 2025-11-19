'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@/payload-types'

interface AuthRedirectProps {
  user: User | null
  redirectTo?: string
  message?: string
}

export function AuthRedirect({
  user,
  redirectTo = '/dashboard',
  message = 'Вы уже вошли в систему. Перенаправление на панель управления...',
}: AuthRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    if (user) {
      toast.info('Уже вошли в систему', {
        description: message,
      })
      router.push(redirectTo)
    }
  }, [user, redirectTo, message, router])

  return null
}
