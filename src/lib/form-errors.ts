import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/client'

/**
 * Puts server field errors (409 "username taken", 400 "current password is
 * incorrect") on the matching form fields. Returns true if any were applied,
 * so the caller only toasts errors that aren't tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: Path<T>[]): boolean {
  if (!(error instanceof ApiError) || !error.details?.length) return false
  let applied = false
  for (const issue of error.details) {
    if ((fields as string[]).includes(issue.path)) {
      setError(issue.path as Path<T>, { type: 'server', message: issue.message })
      applied = true
    }
  }
  return applied
}

/** The server's machine-readable reason ('email_not_verified', 'invalid_token'…), if it sent one. */
export const errorCode = (error: unknown): string | undefined => (error instanceof ApiError ? error.code : undefined)
