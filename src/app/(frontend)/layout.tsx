import '@/globals.css'

import { Geist as FontSans } from 'next/font/google'
import { Geist_Mono as FontMono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AuthProvider } from './AuthContext'

import { cn } from '@/lib/utils'

import type { Metadata } from 'next'

const fontSans = FontSans({
  subsets: ['latin'],
})

const fontMono = FontMono({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'RocoScore - Футбольная платформа',
  description: 'Современная платформа для прогнозов и статистики футбола',
  metadataBase: new URL('https://rocoscore.ru/'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://rocoscore.ru/',
    siteName: 'RocoScore',
    title: 'RocoScore - Футбольная платформа',
    description: 'Современная платформа для прогнозов и статистики футбола',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RocoScore - Футбольная платформа',
    description: 'Современная платформа для прогнозов и статистики футбола',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${fontSans.className} ${fontMono.className} antialiased`}
      suppressHydrationWarning
    >
      <body className={cn('flex flex-col min-h-screen', fontSans.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors expand={true} closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
