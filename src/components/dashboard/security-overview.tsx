import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react'

import type { User } from '@/payload-types'

interface SecurityOverviewProps {
  user: User
}

export function SecurityOverview({ user }: SecurityOverviewProps) {
  // Calculate security score based on various factors
  const getSecurityScore = () => {
    let score = 0
    const factors = []
    
    // Email verification (30 points)
    if (user.emailVerified) {
      score += 30
      factors.push('Email verified')
    } else {
      factors.push('Email not verified')
    }
    
    // Account age (20 points if > 1 day)
    const accountAge = user.createdAt ? 
      Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
    if (accountAge > 1) {
      score += 20
      factors.push('Established account')
    }
    
    // Role assignment (20 points)
    if (user.role) {
      score += 20
      factors.push('Role assigned')
    }
    
    // Password set (30 points - assuming if user exists, password is set)
    score += 30
    factors.push('Password protected')
    
    return { score, factors }
  }

  const { score, factors } = getSecurityScore()
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { label: 'Strong', variant: 'success' as const }
    if (score >= 60) return { label: 'Good', variant: 'warning' as const }
    return { label: 'Needs Improvement', variant: 'destructive' as const }
  }

  const scoreStatus = getScoreStatus(score)

  const securityFeatures = [
    {
      name: 'Email Verification',
      status: user.emailVerified,
      description: 'Confirms your email address ownership',
      icon: CheckCircle2,
      action: !user.emailVerified ? 'Verify Email' : null
    },
    {
      name: 'Password Protection',
      status: true, // Assuming password is always set for authenticated users
      description: 'Account secured with password',
      icon: Lock,
      action: 'Change Password'
    },
    {
      name: 'Login Monitoring',
      status: true,
      description: 'Track account access activity',
      icon: Globe,
      action: 'View Activity'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Security Score</span>
            <Badge variant={scoreStatus.variant}>
              {scoreStatus.label}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall security</span>
              <span className={`font-medium ${getScoreColor(score)}`}>
                {score}/100
              </span>
            </div>
            <Progress value={score} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Based on {factors.length} security factors
            </p>
          </div>
        </div>

        <Separator />

        {/* Security Features */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Security Features</h4>
          <div className="space-y-3">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${
                    feature.status 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                {feature.action && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    {feature.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Security Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recommendations</h4>
          <div className="space-y-2">
            {!user.emailVerified && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Verify your email address
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Email verification is required for account security and password recovery.
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </CardContent>
    </Card>
  )
}