'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { useResendVerification } from '@/hooks/auth/use-auth'

/**
 * "Check your email" panel shown after sign-up. `sent` is false when the email
 * provider failed, in which case Resend is the first thing to try.
 */
export function CheckEmail({ email, sent, onUseAnother }: { email: string; sent: boolean; onUseAnother?: () => void }) {
  const resend = useResendVerification()

  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <Mail className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {sent ? 'We sent a verification link to ' : 'Your account is ready, but we couldn’t send the verification link to '}
        <strong className="font-semibold break-all text-foreground">{email}</strong>
        {sent ? '. Open it to confirm your address, then log in.' : '. Try Resend below.'}
      </p>

      {resend.isError && (
        <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {resend.error.message}
        </p>
      )}

      <div className="mt-6 grid gap-2">
        <Button
          variant="outline"
          className="h-11"
          disabled={resend.isPending}
          onClick={() => resend.mutate(email, { onSuccess: res => toast.success(res.message) })}
        >
          {resend.isPending ? 'Sending…' : 'Resend the email'}
        </Button>
        <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to log in
        </Link>
        {onUseAnother && (
          <button type="button" onClick={onUseAnother} className="mt-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Use a different email
          </button>
        )}
      </div>
      <p className="mt-5 text-[13px] text-muted-foreground">Can’t find it? Check your spam folder. The link works for 24 hours.</p>
    </div>
  )
}
