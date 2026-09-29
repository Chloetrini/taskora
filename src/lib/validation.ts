import { z } from 'zod'
import {
  LIMITS,
  PASSWORD_SPECIAL,
  RESERVED_USERNAMES,
  TODO_CATEGORIES,
  TODO_DUE_FILTERS,
  TODO_PRIORITIES,
  TODO_SORTS,
  TODO_STATUSES,
  USERNAME_PATTERN,
} from '@/constants/todo-values'

/*
 * The ONE place validation rules live. API routes validate request bodies
 * with these schemas; client forms build on the same field schemas, so the
 * browser and the server can never disagree about what's valid.
 */

// ---------- Field schemas ----------

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.usernameMin, `At least ${LIMITS.usernameMin} characters`)
  .max(LIMITS.usernameMax, `${LIMITS.usernameMax} characters or fewer`)
  .regex(USERNAME_PATTERN, 'Lowercase letters, numbers and underscores, starting with a letter')
  .refine(v => !RESERVED_USERNAMES.includes(v), 'That username is reserved')

// For NEW passwords only (sign-up, change, reset). Login deliberately doesn't
// use it, so accounts made before this rule existed can still sign in.
export const passwordField = z
  .string()
  .min(LIMITS.passwordMin, `At least ${LIMITS.passwordMin} characters`)
  .max(LIMITS.passwordMax, `${LIMITS.passwordMax} characters or fewer`)
  .regex(PASSWORD_SPECIAL, 'Include a special character, like ! @ # $ %')

export const emailField = z.string().trim().toLowerCase().email('Enter a valid email')
export const fullNameField = z.string().trim().min(2, 'Enter your full name').max(LIMITS.fullName, `Keep it under ${LIMITS.fullName} characters`)
export const bioField = z.string().trim().max(LIMITS.bio, `Keep your bio under ${LIMITS.bio} characters`)

export const titleField = z.string().trim().min(1, 'Give the task a name').max(LIMITS.title, `Keep it under ${LIMITS.title} characters`)
export const notesField = z.string().trim().max(LIMITS.notes, `Keep notes under ${LIMITS.notes} characters`)

export const dueDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
  .refine(value => {
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
  }, 'Enter a real calendar date')
  .nullable()

export const tagsField = z
  .array(z.string().trim().toLowerCase().min(1).max(LIMITS.tagLength, `Tags must be ${LIMITS.tagLength} characters or fewer`))
  .max(LIMITS.tags, `Up to ${LIMITS.tags} tags`)
  .transform(tags => [...new Set(tags)])

const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

export const subtaskInput = z.object({
  _id: objectIdField.optional(), // present when editing an existing subtask
  title: z.string().trim().min(1, 'Subtask needs a name').max(LIMITS.title),
  done: z.boolean().optional().default(false),
})

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// ---------- API request schemas ----------

export const registerBody = z.object({ fullName: fullNameField, username: usernameField, email: emailField, password: passwordField }).strict()

export const loginBody = z
  .object({
    identifier: z.string().trim().toLowerCase().min(1, 'Enter your email or username'),
    password: z.string().min(1, 'Enter your password'),
  })
  .strict()

export const updateProfileBody = z
  .object({ fullName: fullNameField, username: usernameField, email: emailField, bio: bioField })
  .partial()
  .strict()
  .refine(d => Object.keys(d).length > 0, 'Send at least one field to update')

export const changePasswordBody = z
  // currentPassword is optional: Google-only accounts set their first password without one.
  .object({ currentPassword: z.string().optional(), newPassword: passwordField })
  .strict()
  .refine(d => d.currentPassword !== d.newPassword, { message: 'Use a different password', path: ['newPassword'] })

// The random string from an emailed link. A wrong-shaped one gets the same message as an expired one.
export const tokenField = z.string().trim().min(20, 'This link is invalid or has expired').max(200, 'This link is invalid or has expired')

export const verifyEmailBody = z.object({ token: tokenField }).strict()
export const resendVerificationBody = z
  .object({ identifier: z.string().trim().toLowerCase().min(1, 'Enter your email or username') })
  .strict()
export const forgotPasswordBody = z.object({ email: emailField }).strict()
// The new password is checked BEFORE the token is touched, so a weak password doesn't burn the link.
export const resetPasswordBody = z.object({ token: tokenField, newPassword: passwordField }).strict()

// Password accounts send `password`; Google-only accounts send `confirmUsername`.
export const deleteAccountBody = z
  .object({ password: z.string().optional(), confirmUsername: z.string().optional() })
  .strict()
  .refine(d => Boolean(d.password || d.confirmUsername), 'Confirm with your password')

const todoFields = {
  title: titleField,
  notes: notesField,
  priority: z.enum(TODO_PRIORITIES),
  category: z.enum(TODO_CATEGORIES),
  tags: tagsField,
  dueDate: dueDateField,
  subtasks: z.array(subtaskInput).max(LIMITS.subtasks, `Up to ${LIMITS.subtasks} subtasks`),
  pinned: z.boolean(),
}

export const createTodoBody = z
  .object({
    title: todoFields.title,
    notes: todoFields.notes.optional().default(''),
    priority: todoFields.priority.optional().default('medium'),
    category: todoFields.category.optional().default('personal'),
    tags: todoFields.tags.optional().default([]),
    dueDate: todoFields.dueDate.optional().default(null),
    subtasks: todoFields.subtasks.optional().default([]),
    pinned: todoFields.pinned.optional().default(false),
  })
  .strict()

export const updateTodoBody = z
  .object({ ...todoFields, completed: z.boolean() })
  .partial()
  .strict()
  .refine(d => Object.keys(d).length > 0, 'Send at least one field to update')

export const toggleSubtaskBody = z.object({ done: z.boolean() }).strict()

export const listTodosQuery = z.object({
  status: z.enum(TODO_STATUSES).optional().default('all'),
  priority: z.enum(TODO_PRIORITIES).optional(),
  category: z.enum(TODO_CATEGORIES).optional(),
  tag: z.string().trim().toLowerCase().max(LIMITS.tagLength).optional(),
  due: z.enum(TODO_DUE_FILTERS).optional().default('any'),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(TODO_SORTS).optional().default('newest'),
  // The viewer's own "today". Due filters are calendar-day based and the
  // server can't know the user's timezone.
  today: isoDay.optional(),
})

export const statsQuery = z.object({ today: isoDay.optional() })
export const usernameQuery = z.object({ username: z.string().trim().max(40) })

export type RegisterBody = z.infer<typeof registerBody>
export type LoginBody = z.infer<typeof loginBody>
export type UpdateProfileBody = z.infer<typeof updateProfileBody>
export type ChangePasswordBody = z.infer<typeof changePasswordBody>
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>
export type CreateTodoBody = z.infer<typeof createTodoBody>
export type UpdateTodoBody = z.infer<typeof updateTodoBody>
export type ListTodosQuery = z.infer<typeof listTodosQuery>
