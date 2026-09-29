import { AuthShell } from '@/components/auth/auth-shell'
import { GuestOnly } from '@/components/guards/guest-only'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestOnly>
      <AuthShell>{children}</AuthShell>
    </GuestOnly>
  )
}
