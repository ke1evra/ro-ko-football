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
        <p className="grid gap-1 underline text-primary">
          <a href="https://github.com/brijr/payload-starter">View on GitHub &rarr;</a>
          <a href="https://payloadcms.com/docs">Read the Payload Docs &rarr;</a>
        </p>
        <p>
          This starter uses Payload, Postgres, Resend, and Cloudflare R2 (or AWS S3, or Vercel
          Blob).
        </p>
        <p>
          Created by{' '}
          <a className="underline text-primary" href="https://brijr.dev">
            @brijr
          </a>
        </p>
      </Container>
    </Section>
  )
}
