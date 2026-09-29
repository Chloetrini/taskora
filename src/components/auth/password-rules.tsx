import { Check, Circle } from 'lucide-react'
import { LIMITS, PASSWORD_SPECIAL } from '@/constants/todo-values'
import { cn } from '@/lib/utils'

/**
 * Live checklist under a NEW-password field. The rules come from the same
 * constants the API validates with, so a tick here means the server agrees.
 */
export function PasswordRules({ value }: { value: string }) {
  const rules = [
    { label: `At least ${LIMITS.passwordMin} characters`, met: value.length >= LIMITS.passwordMin },
    { label: 'A special character, like ! @ # $ %', met: PASSWORD_SPECIAL.test(value) },
  ]
  return (
    <ul aria-label="Password requirements" className="grid gap-1">
      {rules.map(rule => (
        <li key={rule.label} className={cn('flex items-center gap-1.5', rule.met ? 'text-done' : 'text-muted-foreground')}>
          {rule.met ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
          {rule.label}
          <span className="sr-only">{rule.met ? ' (met)' : ' (not met yet)'}</span>
        </li>
      ))}
    </ul>
  )
}
