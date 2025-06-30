import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Settings, 
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react'

import type { User as UserType } from '@/payload-types'

interface UserProfileCardProps {
  user: UserType
  accountAgeDays: number
}

export function UserProfileCard({ user, accountAgeDays }: UserProfileCardProps) {
  // Generate initials from email
  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const formattedCreatedAt = createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt={user.email} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold">{user.email}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                {user.role}
              </Badge>
              {user.emailVerified ? (
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
            <p className="text-sm text-muted-foreground">
              Member for {accountAgeDays} {accountAgeDays === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Account Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Account Details</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email address</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account type</span>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{formattedCreatedAt}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email verified</span>
              <span className="font-medium">
                {user.emailVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}