import type { Metadata } from 'next'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import { RequireAuth } from '@/components/guards/require-auth'

// Everything behind login is private: keep it out of search results entirely.
export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Shell for every signed-in page. proxy.ts redirects before this renders when there's no cookie. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <Navbar />
        <main className="flex-1 pt-8 sm:pt-10">{children}</main>
        <Footer />
      </div>
    </RequireAuth>
  )
}
