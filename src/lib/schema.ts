import { z } from 'zod'
import { LIMITS, TODO_CATEGORIES, TODO_PRIORITIES } from '@/constants/todo-values'
import { bioField, emailField, fullNameField, notesField, passwordField, titleField, usernameField } from '@/lib/validation'
import type { TodoInput } from '@/types/todo'

// Client form schemas. Field rules come from lib/validation.ts — the same
// schemas the API routes use — so a form can never accept what the server rejects.

export { usernameField as usernameSchema }

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({ fullName: fullNameField, username: usernameField, email: emailField, password: passwordField, confirmPassword: z.string() })
  .refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })
export type RegisterFormValues = z.infer<typeof registerSchema>

export const profileSchema = z.object({ fullName: fullNameField, username: usernameField, email: emailField, bio: bioField })
export type ProfileFormValues = z.infer<typeof profileSchema>

// currentPassword is checked in the form only when the account has a password
// (Google-only accounts are setting their first one).
export const passwordFormSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })
  .refine(d => d.newPassword !== d.currentPassword, { message: 'Use a different password', path: ['newPassword'] })
export type PasswordFormValues = z.infer<typeof passwordFormSchema>

export const todoFormSchema = z.object({
  title: titleField,
  notes: notesField,
  priority: z.enum(TODO_PRIORITIES),
  category: z.enum(TODO_CATEGORIES),
  dueDate: z.string(), // '' = no due date (native date inputs give '' or 'YYYY-MM-DD')
  tags: z.array(z.string().max(LIMITS.tagLength)).max(LIMITS.tags, `Up to ${LIMITS.tags} tags`),
  subtasks: z
    .array(z.object({ _id: z.string().optional(), title: z.string().trim().max(LIMITS.title), done: z.boolean() }))
    .max(LIMITS.subtasks, `Up to ${LIMITS.subtasks} subtasks`),
  pinned: z.boolean(),
})
export type TodoFormValues = z.infer<typeof todoFormSchema>

export const EMPTY_TODO_FORM: TodoFormValues = {
  title: '',
  notes: '',
  priority: 'medium',
  category: 'personal',
  dueDate: '',
  tags: [],
  subtasks: [],
  pinned: false,
}

/** Form values → API body: '' due date becomes null, blank subtasks are dropped. */
export const toTodoInput = (v: TodoFormValues): TodoInput => ({
  title: v.title,
  notes: v.notes,
  priority: v.priority,
  category: v.category,
  dueDate: v.dueDate || null,
  tags: v.tags,
  subtasks: v.subtasks
    .filter(s => s.title.trim())
    .map(s => ({ ...(s._id ? { _id: s._id } : {}), title: s.title.trim(), done: s.done })),
  pinned: v.pinned,
})
