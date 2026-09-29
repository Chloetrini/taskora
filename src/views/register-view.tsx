'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Field } from '@/components/ui/field'
import { UsernameStatus } from '@/components/auth/username-status'
import { PasswordRules } from '@/components/auth/password-rules'
import { CheckEmail } from '@/components/auth/check-email'
import { useRegister } from '@/hooks/auth/use-auth'
import { useUsernameAvailability } from '@/hooks/shared/use-username-availability'
import { registerSchema, type RegisterFormValues } from '@/lib/schema'
import { applyServerErrors } from '@/lib/form-errors'
import { GoogleButton, OrDivider } from '@/components/auth/google-button'

export default function RegisterView({ googleEnabled }: { googleEnabled: boolean }) {
  const registerUser = useRegister()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', email: '', password: '', confirmPassword: '' },
  })

  const username = useWatch({ control, name: 'username' })
  const password = useWatch({ control, name: 'password' })
  const availability = useUsernameAvailability(username)

  const onSubmit = (values: RegisterFormValues) => {
    if (availability.status === 'unavailable') {
      return setError('username', { message: availability.reason })
    }
    const { confirmPassword: _confirm, ...body } = values
    registerUser.mutate(body, {
      onSuccess: () => toast.success('Account created'),
      onError: error => {
        if (!applyServerErrors(error, setError, ['fullName', 'username', 'email', 'password'])) toast.error(error.message)
      },
    })
  }

  // Creating an account doesn't sign anyone in: the address has to be confirmed first.
  if (registerUser.isSuccess) {
    return <CheckEmail email={registerUser.data.body.email} sent={registerUser.data.body.verificationSent} onUseAnother={() => registerUser.reset()} />
  }

  return (
    <>
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Create your account</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
        <Field id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" autoFocus aria-invalid={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field id="username" label="Username" error={errors.username?.message} hint={<UsernameStatus state={availability} />}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            <Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} aria-invalid={!!errors.username} className="pl-7" {...register('username')} />
          </div>
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <div className="grid gap-4">
          <Field id="password" label="Password" error={errors.password?.message} hint={<PasswordRules value={password} />}>
            <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          </Field>
        </div>
        <Button type="submit" disabled={registerUser.isPending} className="mt-2 h-11">
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton next={next} label="Sign up with Google" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  )
}
