import Footer from '@/components/site/footer'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
