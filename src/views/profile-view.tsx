'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { toast } from 'react-toastify'
import PageWrapper from '@/components/layout/page-wrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Field, Textarea } from '@/components/ui/field'
import { UsernameStatus } from '@/components/auth/username-status'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { useCurrentUser } from '@/components/guards/require-auth'
import { authKeys } from '@/hooks/auth/use-auth'
import { useChangePassword, useDeleteAccount, useUpdateProfile } from '@/hooks/profile/use-profile'
import { useTodoStats } from '@/hooks/todos/use-todos'
import { useUsernameAvailability } from '@/hooks/shared/use-username-availability'
import { passwordFormSchema, profileSchema, type PasswordFormValues, type ProfileFormValues } from '@/lib/schema'
import { applyServerErrors } from '@/lib/form-errors'
import type { User } from '@/types/user'

function Card({ title, description, children, tone }: { title: string; description?: string; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <section className={`rounded-lg border bg-surface p-5 sm:p-6 ${tone === 'danger' ? 'border-destructive/40' : 'border-border'}`}>
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, username: user.username, email: user.email, bio: user.bio },
  })

  const username = useWatch({ control, name: 'username' })
  const bio = useWatch({ control, name: 'bio' })
  const availability = useUsernameAvailability(username, user.username)

  const onSubmit = (values: ProfileFormValues) => {
    if (availability.status === 'unavailable') return setError('username', { message: availability.reason })
    // Send only what changed.
    const changes = Object.fromEntries(
      (Object.keys(values) as (keyof ProfileFormValues)[]).filter(k => values[k] !== user[k]).map(k => [k, values[k]])
    )
    if (Object.keys(changes).length === 0) return
    updateProfile.mutate(changes, {
      onSuccess: res => {
        toast.success('Profile updated')
        reset({ fullName: res.body.fullName, username: res.body.username, email: res.body.email, bio: res.body.bio })
      },
      onError: error => {
        if (!applyServerErrors(error, setError, ['fullName', 'username', 'email', 'bio'])) toast.error(error.message)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Full name" error={errors.fullName?.message}>
          <Input id="profile-name" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field id="profile-username" label="Username" error={errors.username?.message} hint={<UsernameStatus state={availability} />}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            <Input id="profile-username" autoCapitalize="none" spellCheck={false} maxLength={20} aria-invalid={!!errors.username} className="pl-7" {...register('username')} />
          </div>
        </Field>
      </div>
      <Field id="profile-email" label="Email" error={errors.email?.message}>
        <Input id="profile-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field id="profile-bio" label="Bio" error={errors.bio?.message} hint={`${bio.length}/160`}>
        <Textarea id="profile-bio" rows={3} maxLength={160} placeholder="A line about you" aria-invalid={!!errors.bio} {...register('bio')} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const changePassword = useChangePassword()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = ({ currentPassword, newPassword }: PasswordFormValues) => {
    if (hasPassword && !currentPassword) return setError('currentPassword', { message: 'Enter your current password' })
    changePassword.mutate(
      hasPassword ? { currentPassword, newPassword } : { newPassword },
      {
        onSuccess: res => {
          toast.success(res.message)
          reset()
          // hasPassword flips to true after setting one — refresh the user.
          if (!hasPassword) queryClient.invalidateQueries({ queryKey: authKeys.me })
        },
        onError: error => {
          if (!applyServerErrors(error, setError, ['currentPassword', 'newPassword'])) toast.error(error.message)
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {hasPassword && (
        <Field id="current-password" label="Current password" error={errors.currentPassword?.message}>
          <PasswordInput id="current-password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="new-password" label="New password" error={errors.newPassword?.message}>
          <PasswordInput id="new-password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
        </Field>
        <Field id="confirm-password" label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirm-password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
        </Button>
      </div>
    </form>
  )
}

function DeleteAccount({ user }: { user: User }) {
  const deleteAccount = useDeleteAccount()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')

  if (!confirming) {
    return (
      <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
        Delete my account
      </Button>
    )
  }

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={e => {
        e.preventDefault()
        deleteAccount.mutate(user.hasPassword ? { password } : { confirmUsername: password }, {
          onSuccess: () => {
            toast.success('Account deleted')
            router.replace('/')
          },
        })
      }}
    >
      {user.hasPassword ? (
        <Field id="delete-password" label="Enter your password to confirm" error={deleteAccount.isError ? deleteAccount.error.message : undefined}>
          <PasswordInput id="delete-password" autoComplete="current-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
      ) : (
        <Field id="delete-username" label={`Type your username (${user.username}) to confirm`} error={deleteAccount.isError ? deleteAccount.error.message : undefined}>
          <Input id="delete-username" autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!password || deleteAccount.isPending} className="bg-destructive text-white hover:bg-destructive/90">
          {deleteAccount.isPending ? 'Deleting…' : 'Delete account and all tasks'}
        </Button>
      </div>
    </form>
  )
}

export default function ProfileView() {
  const user = useCurrentUser()
  const { data: stats } = useTodoStats()

  return (
    <PageWrapper size="wide">
      <div className="flex items-start gap-5">
        <AvatarUpload user={user} />
        <div className="min-w-0 pt-2">
          <h1 className="truncate font-display text-3xl font-extrabold tracking-[-0.03em]">{user.fullName}</h1>
          <p className="truncate text-muted-foreground">@{user.username}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            Joined {format(parseISO(user.createdAt), 'MMMM yyyy')}
            {user.googleLinked && <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">Google connected</span>}
          </p>
        </div>
      </div>
      {user.bio && <p className="mt-5 max-w-prose leading-relaxed">{user.bio}</p>}

      {stats && (
        <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-border py-4 text-center">
          <div>
            <dt className="text-[13px] text-muted-foreground">Tasks</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{stats.total}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Completed</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-done">{stats.completed}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Completion</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{stats.completionRate}%</dd>
          </div>
        </dl>
      )}

      <div className="mt-8 grid gap-6">
        <Card title="Profile" description="Your name, username, email and bio.">
          <ProfileForm key={user.updatedAt} user={user} />
        </Card>
        <Card
          title={user.hasPassword ? 'Password' : 'Set a password'}
          description={user.hasPassword ? 'Use at least 8 characters.' : 'You sign in with Google. Set a password to also log in with your email or username.'}
        >
          <PasswordForm hasPassword={user.hasPassword} />
        </Card>
        <Card title="Delete account" description="Permanently deletes your account and every task. This can't be undone." tone="danger">
          <DeleteAccount user={user} />
        </Card>
      </div>
    </PageWrapper>
  )
}
