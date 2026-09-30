import type { Metadata } from 'next'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'

// Tasks live in each visitor's own browser: nothing here is worth indexing.
export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Shell for every app page. No sign-in: the app is open to everyone. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1 pt-8 sm:pt-10">{children}</main>
      <Footer />
    </div>
  )
}
