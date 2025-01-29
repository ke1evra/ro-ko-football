import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/public/logo.svg'

import { Section, Container } from '../craft'

export default function Footer() {
  return (
    <nav className="border-b sticky top-0 bg-accent">
      <Section className="p-0 md:p-0">
        <Container className="py-3 md:py-4">
          <Link href="/" className="flex gap-3 items-end">
            <Image
              src={Logo}
              width={36}
              alt="Payload SaaS Starter"
              className="invert dark:invert-0"
            />
            <h3 className="-mt-1">Payload SaaS Starter</h3>
          </Link>
        </Container>
      </Section>
    </nav>
  )
}
