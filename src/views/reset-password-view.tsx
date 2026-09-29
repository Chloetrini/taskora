'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button, buttonVariants } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Field } from '@/components/ui/field'
import { PasswordRules } from '@/components/auth/password-rules'
import { useResetPassword } from '@/hooks/auth/use-auth'
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '@/lib/schema'
import { applyServerErrors, errorCode } from '@/lib/form-errors'
import { cn } from '@/lib/utils'

function LinkProblem({ message }: { message: string }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">This link didn’t work</h1>
      <p role="alert" className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Link href="/forgot-password" className={cn(buttonVariants(), 'mt-6 h-11 w-full')}>
        Send me a new link
      </Link>
    </div>
  )
}

export default function ResetPasswordView() {
  const token = useSearchParams().get('token') ?? ''
  const reset = useResetPassword()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema), defaultValues: { newPassword: '', confirmPassword: '' } })
  const newPassword = useWatch({ control, name: 'newPassword' })

  if (!token) return <LinkProblem message="The link is incomplete. Open it again from your email, or ask for a new one." />

  if (reset.isSuccess) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-done/15 text-done">
          <CircleCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">You’ve been signed out everywhere. Log in with your new password.</p>
        <Link href="/login" className={cn(buttonVariants(), 'mt-6 h-11 w-full')}>
          Go to log in
        </Link>
      </div>
    )
  }

  // The link itself is bad (expired, used, replaced): a form can't fix that.
  if (reset.isError && errorCode(reset.error) === 'invalid_token') return <LinkProblem message={reset.error.message} />

  const onSubmit = ({ newPassword }: ResetPasswordFormValues) =>
    reset.mutate(
      { token, newPassword },
      {
        onSuccess: () => toast.success('Password updated'),
        onError: error => {
          if (errorCode(error) !== 'invalid_token' && !applyServerErrors(error, setError, ['newPassword'])) toast.error(error.message)
        },
      }
    )

  return (
    <>
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">You’ll be signed out on every device.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
        <Field id="newPassword" label="New password" error={errors.newPassword?.message} hint={<PasswordRules value={newPassword} />}>
          <PasswordInput id="newPassword" autoComplete="new-password" autoFocus aria-invalid={!!errors.newPassword} {...register('newPassword')} />
        </Field>
        <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
        <Button type="submit" disabled={reset.isPending} className="mt-2 h-11">
          {reset.isPending ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </>
  )
}
