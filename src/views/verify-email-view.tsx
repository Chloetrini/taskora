'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CircleCheck, MailCheck, TriangleAlert } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useVerifyEmail } from '@/hooks/auth/use-auth'
import { cn } from '@/lib/utils'

/**
 * The page the emailed link opens. It asks for one click instead of verifying
 * on load: mail scanners and link previews fetch URLs automatically, and must
 * not be able to use up the single-use token.
 */
export default function VerifyEmailView() {
  const token = useSearchParams().get('token') ?? ''
  const verify = useVerifyEmail()

  if (verify.isSuccess) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-done/15 text-done">
          <CircleCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Email verified</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold break-all text-foreground">{verify.data.body.email}</strong> is confirmed. You can log in now.
        </p>
        <Link href="/login" className={cn(buttonVariants(), 'mt-6 h-11 w-full')}>
          Log in
        </Link>
      </div>
    )
  }

  if (!token || verify.isError) {
    const message = !token ? 'The link is incomplete. Open it again from your email.' : verify.error!.message
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">This link didn’t work</h1>
        <p role="alert" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Log in with your password and we’ll offer to send a fresh link.</p>
        <Link href="/login" className={cn(buttonVariants(), 'mt-6 h-11 w-full')}>
          Go to log in
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <MailCheck className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Confirm your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">One click and you’re done.</p>
      <Button className="mt-6 h-11 w-full" disabled={verify.isPending} onClick={() => verify.mutate(token)}>
        {verify.isPending ? 'Verifying…' : 'Verify my email'}
      </Button>
    </div>
  )
}
