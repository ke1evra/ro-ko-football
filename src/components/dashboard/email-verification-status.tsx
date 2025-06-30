'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { resendVerification } from '@/lib/auth'

import type { User } from '@/payload-types'

interface EmailVerificationStatusProps {
  user: User
}

export function EmailVerificationStatus({ user }: EmailVerificationStatusProps) {
  const [isResending, setIsResending] = useState(false)

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const result = await resendVerification(user.email)
      if (result.success) {
        toast.success('Verification email sent', {
          description: 'Please check your inbox for the verification link.',
        })
      } else {
        toast.error('Failed to send verification email', {
          description: result.error || 'Please try again later.',
        })
      }
    } catch (_error) {
      toast.error('Failed to send verification email', {
        description: 'Please try again later.',
      })
    } finally {
      setIsResending(false)
    }
  }

  const isVerified = user.emailVerified

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {isVerified ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Unverified
            </Badge>
          )}
        </div>

        {!isVerified && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <div className="ml-2">
              <p className="text-sm font-medium">Email not verified</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please verify your email address to secure your account and access all features.
              </p>
            </div>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Email address:</span>
          <span className="text-sm font-medium">{user.email}</span>
        </div>

        {!isVerified && (
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}