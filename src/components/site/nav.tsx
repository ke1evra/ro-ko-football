import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/public/logo.svg'

import { Button } from '../ui/button'
import { Section, Container } from '../craft'

import { getUser } from '@/lib/auth'
import type { User } from '@/payload-types'

export default async function Nav() {
  const user: User | null = await getUser()

  return (
    <nav className="border-b sticky top-0 bg-accent">
      <Section className="p-0 md:p-0">
        <Container className="py-3 md:py-4 flex justify-between items-center">
          <Link href="/" className="flex gap-3 items-end">
            <Image
              src={Logo}
              width={36}
              alt="Payload SaaS Starter"
              className="invert dark:invert-0"
            />
            <h3 className="-mt-1">Payload SaaS Starter</h3>
          </Link>

          <div className="flex gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </Container>
      </Section>
    </nav>
  )
}
