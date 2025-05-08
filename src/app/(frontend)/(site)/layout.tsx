import Nav from '@/components/site/nav'
import Footer from '@/components/site/footer'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  )
}
