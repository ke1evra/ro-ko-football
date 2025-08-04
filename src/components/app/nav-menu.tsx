'use client'

import { usePathname } from 'next/navigation'

import Link from 'next/link'

const NAV_MENU_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
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

export const NavMenu = () => {
  const pathname = usePathname()

  return (
    <div className="flex items-center justify-center gap-4">
      {NAV_MENU_ITEMS.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`text-sm transition-all flex items-center gap-1 ${
              isActive
                ? 'text-foreground cursor-default'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive ? <div className="flex rounded-full w-2 h-2 bg-primary" /> : ''}
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
