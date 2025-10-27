'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/(frontend)/AuthContext' // Импортируем хук из AuthContext
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { SiteLogo } from '@/components/site/Logo'
import { Container } from '@/components/ds'

export const Header = () => {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <Container className="flex justify-between items-center py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="RoCoScore home">
          <SiteLogo className="text-2xl" />
        </Link>
        <nav className="hidden md:flex items-center justify-center flex-1 mx-8">
          <div className="flex items-center gap-6 text-base font-medium">
            <Link
              href="/posts"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Посты
            </Link>
            <Link
              href="/federations"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Федерации
            </Link>
            <Link
              href="/countries"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Страны
            </Link>
            <Link
              href="/leagues"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Лиги
            </Link>
            <Link
              href="/predictions"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Прогнозы
            </Link>
            <Link
              href="/ui-demo"
              className="text-lg uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
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
                  <UserAvatar user={user} size="lg" />
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
      </Container>
    </header>
  )
}
