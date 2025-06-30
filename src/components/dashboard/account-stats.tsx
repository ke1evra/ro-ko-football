import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Shield, 
  User as UserIcon,
  Key
} from 'lucide-react'

import type { User } from '@/payload-types'

interface AccountStatsProps {
  user: User
  accountAgeDays: number
}

export function AccountStats({ user, accountAgeDays }: AccountStatsProps) {
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const formattedCreatedAt = createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Calculate profile completion percentage
  const profileFields = [
    { name: 'Email', completed: !!user.email },
    { name: 'Email Verified', completed: !!user.emailVerified },
    { name: 'Role Assigned', completed: !!user.role },
  ]
  
  const completedFields = profileFields.filter(field => field.completed).length
  const profileCompletion = Math.round((completedFields / profileFields.length) * 100)

  // Account status based on verification and age
  const getAccountStatus = () => {
    if (user.emailVerified && accountAgeDays > 0) {
      return { status: 'Active', variant: 'success' as const }
    } else if (user.emailVerified) {
      return { status: 'Verified', variant: 'success' as const }
    } else {
      return { status: 'Pending', variant: 'warning' as const }
    }
  }

  const accountStatus = getAccountStatus()

  const stats = [
    {
      title: 'Account Status',
      value: accountStatus.status,
      icon: Shield,
      badge: true,
      badgeVariant: accountStatus.variant as "default" | "success" | "destructive" | "outline" | "secondary" | "warning",
      description: user.emailVerified ? 'All verifications complete' : 'Email verification required'
    },
    {
      title: 'Account Age',
      value: `${accountAgeDays} ${accountAgeDays === 1 ? 'day' : 'days'}`,
      icon: Calendar,
      description: `Member since ${formattedCreatedAt}`
    },
    {
      title: 'Profile Completion',
      value: `${profileCompletion}%`,
      icon: UserIcon,
      progress: profileCompletion,
      description: `${completedFields} of ${profileFields.length} fields completed`
    },
    {
      title: 'Account Type',
      value: user.role,
      icon: Key,
      badge: true,
      badgeVariant: (user.role === 'admin' ? 'default' : 'secondary') as "default" | "success" | "destructive" | "outline" | "secondary" | "warning",
      description: `${user.role === 'admin' ? 'Full access' : 'Standard access'} permissions`
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {stat.badge ? (
                  <Badge variant={stat.badgeVariant} className="capitalize">
                    {stat.value}
                  </Badge>
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </div>
              
              {stat.progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={stat.progress} className="h-2" />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}