import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import NotFoundView from '@/views/not-found-view'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <NotFoundView />
      </main>
      <Footer />
    </div>
  )
}
