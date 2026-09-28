import { Logo } from '@/components/layout/navbar'
import { GuestOnly } from '@/components/guards/guest-only'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestOnly>
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* The logo sits right above the card, not at the far top of the page. */}
          <div className="mb-5 flex justify-center">
            <Logo />
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 sm:p-8">{children}</div>
        </div>
      </main>
    </GuestOnly>
  )
}
