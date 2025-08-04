import { LogoutButton } from '@/components/auth/logout-button'
import { Button } from '@/components/ui/button'
import { Nav } from '@/components/ds'

import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/public/logo.svg'

import { getUser } from '@/lib/auth'

import type { User } from '@/payload-types'

export const Header = async () => {
  const user: User | null = await getUser()

  return (
    <Nav
      className="border-b sticky top-0 bg-accent/30 backdrop-blur-md"
      containerClassName="flex justify-between items-center gap-4"
    >
      <Link href="/" className="flex gap-3 items-center">
        <Image src={Logo} width={14} alt="Payload SaaS Starter" className="invert dark:invert-0" />
        <h3 className="sm:text-lg">Payload SaaS Starter</h3>
      </Link>

      <LogoutButton />
    </Nav>
  )
}
