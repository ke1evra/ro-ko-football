import { LogoutButton } from '@/components/auth/logout-button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { Nav } from '@/components/ds'

import { getUser } from '@/lib/auth'

import Link from 'next/link'

import type { User } from '@/payload-types'

const NAV_MENU_ITEMS = [
  {
    label: 'Logs',
    href: '#',
  },
  {
    label: 'Profile',
    href: '#',
  },
  {
    label: 'Settings',
    href: '#',
  },
]

export const AppNav = async () => {
  const user: User | null = await getUser()

  return (
    <Nav
      className="border-b sticky top-0 bg-accent/30 backdrop-blur-md"
      containerClassName="flex justify-between items-center gap-4"
    >
      <Button variant="outline" size="icon" asChild>
        <Link href="/dashboard">
          <Home />
        </Link>
      </Button>

      <div className="flex items-center justify-center gap-4">
        {NAV_MENU_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 items-center justify-end">
        <LogoutButton />
        <ThemeToggle />
      </div>
    </Nav>
  )
}
