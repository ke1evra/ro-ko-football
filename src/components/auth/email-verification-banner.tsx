'use client'

import { useState } from 'react'
import { resendVerification } from '@/lib/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Mail, AlertCircle } from 'lucide-react'

interface EmailVerificationBannerProps {
  userEmail: string
}

export const EmailVerificationBanner = ({ userEmail }: EmailVerificationBannerProps) => {
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleResendVerification = async () => {
    setIsResending(true)
    setMessage('')
    
    try {
      const result = await resendVerification(userEmail)
      
      if (result.success) {
        setIsSuccess(true)
        setMessage('Verification email sent! Please check your inbox.')
      } else {
        setMessage(result.error || 'Failed to send verification email. Please try again.')
      }
    } catch (_error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="border-b bg-yellow-50 dark:bg-yellow-950/20">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center">
            <span className="flex rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/50">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
            </span>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Please verify your email address
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                We sent a verification link to <span className="font-medium">{userEmail}</span>
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={isResending}
              className="bg-white text-yellow-800 hover:bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-200 dark:hover:bg-yellow-900"
            >
              <Mail className="mr-2 h-4 w-4" />
              {isResending ? 'Sending...' : 'Resend Email'}
            </Button>
          </div>
        </div>
        
        {message && (
          <div className="mt-2">
            <Alert variant={isSuccess ? "default" : "destructive"} className="py-2">
              <AlertDescription className="text-sm">
                {message}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}