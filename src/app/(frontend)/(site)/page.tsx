import { Section, Container, Prose } from '@/components/ds'

export default async function Index() {
  return (
    <>
      {/* Replace with your homepage  */}
      <ToDelete />
    </>
  )
}

const ToDelete = () => {
  return (
    <Section>
      <Container>
        <Prose>
          <h2>What if Payload CMS could power your next SaaS?</h2>
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
