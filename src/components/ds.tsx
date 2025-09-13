import * as React from 'react'

export type BaseProps = React.PropsWithChildren<{
  className?: string
}>

export type NavProps = React.PropsWithChildren<{
  className?: string
  containerClassName?: string
}>

export function Section({ className, children }: BaseProps) {
  return (
    <section className={['py-8 md:py-12', className].filter(Boolean).join(' ')}>{children}</section>
  )
}

export function Container({ className, children }: BaseProps) {
  return (
    <div className={['mx-auto w-full max-w-7xl px-4 md:px-6', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function Nav({ className, containerClassName, children }: NavProps) {
  return (
    <nav className={className}>
      <Container className={['py-4', containerClassName].filter(Boolean).join(' ')}>
        {children}
      </Container>
    </nav>
  )
}

export function Main({ className, children }: BaseProps) {
  return <main className={className}>{children}</main>
}

export function Prose({ className, children }: BaseProps) {
  // Оставляем тонкую обёртку, чтобы можно было переопределять типографику через className
  return <div className={className}>{children}</div>
}

export default { Section, Container, Nav, Main, Prose }
