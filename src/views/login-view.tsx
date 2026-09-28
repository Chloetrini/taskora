'use client'

import { SITE } from '@/constants/site'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Field } from '@/components/ui/field'
import { useLogin } from '@/hooks/auth/use-auth'
import { loginSchema, type LoginFormValues } from '@/lib/schema'
import { safeNextPath } from '@/lib/utils'
import { GoogleButton, OrDivider } from '@/components/auth/google-button'

// Messages for /login?error=… (set by the Google sign-in callback).
const OAUTH_ERRORS: Record<string, string> = {
  google_failed: 'Google sign-in didn’t complete. Please try again.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_unverified: 'Your Google email isn’t verified, so we can’t use it to sign you in.',
  google_unavailable: 'Google sign-in isn’t available right now. Use your email or username.',
  too_many_attempts: 'Too many attempts. Try again in a few minutes.',
}

export default function LoginView({ googleEnabled }: { googleEnabled: boolean }) {
  const login = useLogin()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const oauthError = OAUTH_ERRORS[searchParams.get('error') ?? '']

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } })

  const onSubmit = (values: LoginFormValues) =>
    login.mutate(values, { onSuccess: () => router.replace(safeNextPath(next)) })

  return (
    <>
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">Log in to see your tasks.</p>

      {(login.isError || oauthError) && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {login.isError ? login.error.message : oauthError}
        </p>
      )}


      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
        <Field id="identifier" label="Email or username" error={errors.identifier?.message}>
          <Input id="identifier" autoComplete="username" autoFocus aria-invalid={!!errors.identifier} {...register('identifier')} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        <Button type="submit" disabled={login.isPending} className="mt-2 h-11">
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton next={next} />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to {SITE.name}?{' '}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}
