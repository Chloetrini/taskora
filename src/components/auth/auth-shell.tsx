import { Logo } from '@/components/layout/navbar'

/** The centred card every auth-style page sits in, with the logo directly above it. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 sm:p-8">{children}</div>
      </div>
    </main>
  )
}
