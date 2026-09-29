import { AuthShell } from '@/components/auth/auth-shell'

/**
 * Pages reached from an emailed link. Unlike (auth) there is no GuestOnly guard:
 * someone who is already signed in (say, confirming a new email address) must
 * still be able to open them.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
