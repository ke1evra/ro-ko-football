'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/(frontend)/AuthContext' // Импортируем хук из AuthContext
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, LogOut, User as UserIcon, BarChart2 } from 'lucide-react'

export const Header = () => {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase()
    if (email) return email.slice(0, 2).toUpperCase()
    return 'U'
  }

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          NEWS BETS
        </Link>
        <nav className="hidden md:flex items-center justify-center flex-1 mx-8">
          <div className="flex items-center gap-8 text-base font-medium">
            <Link
              href="/posts"
              className="text-xl uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Посты
            </Link>
            <Link
              href="/leagues"
              className="text-xl uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Лиги
            </Link>
            <Link
              href="/ui-demo"
              className="text-xl uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              UI Демо
            </Link>
          </div>
        </nav>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-10 w-24 bg-muted rounded-md animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    {(() => {
                      const avatarRel: unknown = (user as unknown as { avatar?: unknown }).avatar
                      const avatarUrlField: string | undefined = (
                        user as unknown as {
                          avatarUrl?: string
                        }
                      ).avatarUrl
                      let src: string | undefined
                      if (avatarRel && typeof avatarRel === 'object' && 'url' in avatarRel) {
                        const possible = (avatarRel as { url?: unknown }).url
                        src = typeof possible === 'string' ? possible : undefined
                      } else {
                        src = avatarUrlField
                      }
                      return <AvatarImage src={src} alt={user.name || 'Avatar'} />
                    })()}
                    <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Профиль</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Войти
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
