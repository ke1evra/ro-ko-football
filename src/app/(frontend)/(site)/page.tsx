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
        <p className="grid gap-1 underline text-orange-500 dark:text-orange-400">
          <a href="https://github.com/brijr/payload-starter">View on GitHub &rarr;</a>
          <a href="https://payloadcms.com/docs">Read the Payload Docs &rarr;</a>
        </p>
        <p>
          This starter uses Payload, Postgres, Resend, and Cloudflare R2 (or AWS S3, or Vercel
          Blob).
        </p>
        <p>
          Created by{' '}
          <a className="underline text-orange-500 dark:text-orange-400" href="https://brijr.dev">
            @brijr
          </a>
        </p>
        <a
          className="block mt-8"
          href="https://vercel.com/new/clone?repository-url=github.com%2Fbrijr%2Fpayload-starter&project-name=payload-starter&repository-name=payload-starter&env=DATABASE_URI%2CPAYLOAD_SECRET%2CRESEND_API_KEY%2CEMAIL_FROM%2CAPP_URL%2CBLOB_READ_WRITE_TOKEN%2CR2_ACCESS_KEY_ID%2CR2_SECRET_ACCESS_KEY%2CR2_BUCKET%2CR2_ENDPOINT&envDescription=Environment+variables+required+for+payload-starter"
        >
          <img src="https://vercel.com/button" alt="Deploy with Vercel" />
        </a>
      </Container>
    </Section>
  )
}
