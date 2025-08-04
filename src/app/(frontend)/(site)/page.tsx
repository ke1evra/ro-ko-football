import { Container, Section } from '@/components/ds'

export default async function Home() {
  return <ToDelete />
}

const ToDelete = () => {
  return (
    <Section className="font-mono text-sm">
      <Container className="space-y-4">
        <h1>
          Payload Starter (<a href="https://payloadstarter.dev">payloadstarter.dev</a>)
        </h1>
        <p className="underline text-orange-500 dark:text-orange-400">
          <a href="https://github.com/brijr/payload-starter">View on GitHub &rarr;</a>
        </p>
        <p>
          Created by <a href="https://brijr.dev">@brijr</a>
        </p>
      </Container>
    </Section>
  )
}
