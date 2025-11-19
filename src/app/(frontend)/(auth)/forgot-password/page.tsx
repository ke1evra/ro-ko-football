import { Section, Container } from '@/components/ds'
import { AuthBox } from '@/components/auth/auth-box'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const user: User | null = await getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <Section>
      <Container>
        <AuthBox>
          <h1>Забыли пароль</h1>
          <p className="text-muted-foreground my-4 text-sm">
            Введите ваш адрес электронной почты, и мы отправим вам ссылку для сброса пароля.
          </p>
          <ForgotPasswordForm />
          <p className="text-muted-foreground text-xs">
            Вспомнили пароль?{' '}
            <Link className="text-foreground" href="/login">
              В��йти
            </Link>
          </p>
        </AuthBox>
      </Container>
    </Section>
  )
}
