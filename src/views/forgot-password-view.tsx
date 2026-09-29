'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { useForgotPassword } from '@/hooks/auth/use-auth'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/schema'
import { applyServerErrors } from '@/lib/form-errors'

export default function ForgotPasswordView() {
  const forgot = useForgotPassword()
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  const onSubmit = ({ email }: ForgotPasswordFormValues) =>
    forgot.mutate(email, {
      onError: error => {
        applyServerErrors(error, setError, ['email'])
      },
    })

  if (forgot.isSuccess) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Mail className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If an account uses <strong className="font-semibold break-all text-foreground">{getValues('email')}</strong>, we’ve sent a link to reset the password. It works for 30 minutes and can be used once.
        </p>
        <p className="mt-4 text-[13px] text-muted-foreground">Nothing after a few minutes? Check your spam folder, or try again.</p>
        <div className="mt-6 grid gap-2">
          <Button variant="outline" className="h-11" onClick={() => forgot.reset()}>
            Try another email
          </Button>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">Enter your email and we’ll send you a link to choose a new one.</p>

      {forgot.isError && !errors.email && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {forgot.error.message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Button type="submit" disabled={forgot.isPending} className="h-11">
          {forgot.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  )
}
