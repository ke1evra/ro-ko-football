import { Metadata } from 'next'
import { UIDemo } from '@/components/ui-demo/ui-demo'

export const metadata: Metadata = {
  title: 'Демонстрация UI компонентов - Футбольная тематика',
  description: 'Демонстрация всех компонентов shadcn/ui в футбольной тематике',
}

export default function UIDemoPage() {
  return <UIDemo />
}
