import { Container, Section } from '@/components/ds'

export default function LeaguePlaceholderPage() {
  // Пустышка маршрута под итерацию 3
  return (
    <Section>
      <Container>
        <h1 className="text-2xl font-semibold">Лига</h1>
        <p className="text-muted-foreground">
          Страница лиги будет реализована в следующей итерации.
        </p>
      </Container>
    </Section>
  )
}
