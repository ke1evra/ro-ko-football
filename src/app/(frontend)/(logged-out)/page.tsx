import { Section, Container, Prose } from '@/components/craft'

export default async function Index() {
  return (
    <main>
      <ToDelete />
    </main>
  )
}

const ToDelete = () => {
  return (
    <Section className="border-t">
      <Container>
        <Prose>
          <h2>What&apos;s included?</h2>
          <ul className="list-disc list-inside space-y-2 mt-4">
            <li>Open Source SaaS starter for creating applications with Next.js and Payload CMS</li>
            <li>User / admin authentication</li>
            <li>Google Auth & Github Auth integration</li>
            <li>
              <a target="_blank" rel="noopener noreferrer" href="https://tailwindcss.com">
                Tailwind 4
              </a>{' '}
              with{' '}
              <a target="_blank" rel="noopener noreferrer" href="https://ui.shadcn.com">
                shadcn/ui
              </a>{' '}
              components
            </li>
            <li>
              <a target="_blank" rel="noopener noreferrer" href="https://craft-ds.com">
                brijr/craft
              </a>{' '}
              design system
            </li>
            <li>User Dashboard</li>
            <li>Editable Homepage using Globals</li>
            <li>Customizable content blocks</li>
            <li>Blog functionality</li>
          </ul>
          <hr />
          <p>
            Created by{' '}
            <a target="_blank" rel="noopener noreferrer" href="https://bridger.to">
              Bridger Tower
            </a>
            . Follow on{' '}
            <a target="_blank" rel="noopener noreferrer" href="https://bridger.to/x">
              X for updates
            </a>
            .
          </p>
        </Prose>
      </Container>
    </Section>
  )
}
