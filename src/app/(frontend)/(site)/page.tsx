import { Section, Container, Prose } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

import Link from 'next/link'

export default async function Index() {
  const FeatureCategory = ({ title, features }: { title: string; features: string[] }) => {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <Section className="border-b">
        <Container>
          <Prose isSpaced>
            <h1>Payload SaaS Starter</h1>
            <h4>A modern, open-source SaaS starter kit built with Next.js 15 and Payload CMS</h4>
          </Prose>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button asChild>
              <Link href="https://github.com/brijr/payload-saas-starter">Get Started</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <Prose isSpaced>
            <h2>What&apos;s Included</h2>
          </Prose>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 mt-6">
            <FeatureCategory
              title="Complete Authentication System"
              features={[
                'Secure user authentication with HTTP-only cookies',
                'Email verification with automated emails',
                'Password reset flow with secure tokens',
                'Role-based access control (admin/user)',
                'Remember me functionality',
                'Protected routes with middleware',
                'Toast notifications for user feedback',
              ]}
            />
            <FeatureCategory
              title="Modern Tech Stack"
              features={[
                'Next.js 15 with App Router',
                'Payload CMS for content management',
                'TypeScript for type safety',
                'Resend for email service',
                'PostgreSQL database with Payload adapter',
                'Tailwind CSS for styling',
                'shadcn/ui components',
                'Sonner for toast notifications',
                'Dark/light mode with theme persistence',
              ]}
            />
            <FeatureCategory
              title="Developer Experience"
              features={[
                'Clean project structure',
                'Server components and actions',
                'Reusable design system components',
                'Type-safe APIs',
                'Docker configuration included',
                'Vercel deployment ready',
              ]}
            />
            <FeatureCategory
              title="Production Ready Features"
              features={[
                'User dashboard',
                'Account management',
                'Email templates with inline styles',
                'Responsive layouts',
                'SEO optimized',
                'Accessibility focused',
              ]}
            />
          </div>
        </Container>
      </Section>
      <Section className="border-t">
        <Container>
          <Prose>
            <p>
              Created by{' '}
              <a
                href="https://bridger.to"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bridger Tower
              </a>
              . Follow on{' '}
              <a
                href="https://bridger.to/x"
                target="_blank"
                rel="noopener noreferrer"
              >
                X for updates
              </a>
              .
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  )
}
