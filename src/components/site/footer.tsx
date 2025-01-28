import Image from 'next/image'
import Link from 'next/link'
import Balancer from 'react-wrap-balancer'
import Logo from '@/public/logo.svg'

import { Section, Container } from '../craft'

export default function Footer() {
  return (
    <footer className="not-prose border-t">
      <Section>
        <Container className="grid gap-6">
          <div className="grid gap-6">
            <Link href="/">
              <h3 className="sr-only">Payload SaaS Starter</h3>
              <Image
                src={Logo}
                alt="Logo"
                width={48}
                height={39.09}
                className="transition-all hover:opacity-75 invert dark:invert-0"
              />
            </Link>
            <p>
              <Balancer>
                Payload SaaS Starter is an Open Source SaaS starter for creating applications with
                Next.js and Payload CMS
              </Balancer>
            </p>
            <div className="mb-6 flex flex-col gap-4 text-sm text-muted-foreground underline underline-offset-4 md:mb-0 md:flex-row">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-of-service">Terms of Service</Link>
              <Link href="/cookie-policy">Cookie Policy</Link>
            </div>
            <p className="text-muted-foreground">
              © <a href="https://github.com/brijr">brijr</a>. All rights reserved. 2025-present.
            </p>
          </div>
        </Container>
      </Section>
    </footer>
  )
}
