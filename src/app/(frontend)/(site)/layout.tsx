import Footer from '@/components/site/footer'
import Header from '@/components/site/header'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
