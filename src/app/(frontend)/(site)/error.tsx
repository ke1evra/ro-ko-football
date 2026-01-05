'use client'

import { useEffect } from 'react'
import { Container, Section } from '@/components/ds'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Логируем ошибку в консоль для отладки
    console.error('[Home Error Boundary]', error)
  }, [error])

  return (
    <Section>
      <Container className="space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Ошибка загрузки страницы</CardTitle>
            <CardDescription>
              Произошла ошибка при загрузке содержимого. Пожалуйста, попробуйте позже.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded bg-muted p-3 text-sm font-mono text-muted-foreground overflow-auto max-h-40">
              {error.message || 'Неизвестная ошибка'}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => reset()}>Попробовать снова</Button>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                На главную
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Section>
  )
}
