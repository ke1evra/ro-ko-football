'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface LoginPageToastProps {
  success?: string
  error?: string
}

export function LoginPageToast({ success, error }: LoginPageToastProps) {
  useEffect(() => {
    if (success) {
      switch (success) {
        case 'email-verified':
          toast.success('Email подтвержден!', {
            description: 'Ваш email успешно подтвержден. Теперь вы можете войти.',
          })
          break
        default:
          toast.success('Успешно!', {
            description: 'Операция выполнена успешно.',
          })
      }
    }

    if (error) {
      switch (error) {
        case 'invalid-verification-link':
          toast.error('Неверная ссылка подтверждения', {
            description: 'Ссылка подтверждения недействительна. Попробуйте снова.',
          })
          break
        case 'verification-link-expired':
          toast.error('Ссылка подтверждения истекла', {
            description: 'Ссылка подтверждения истекла. Запросите новую.',
          })
          break
        case 'verification-failed':
          toast.error('Подтверждение не удалось', {
            description: 'Подтверждение email не удалось. Попробуйте снова.',
          })
          break
        default:
          toast.error('Ошибка', {
            description: 'Произошла ошибка. Попробуйте снова.',
          })
      }
    }
  }, [success, error])

  return null
}
