// Shared by the server (models, validators) and the client (forms, filters).
// Plain data only — no React, no Mongoose — so both sides can import it.
export const TODO_PRIORITIES = ['low', 'medium', 'high'] as const
export type TodoPriority = (typeof TODO_PRIORITIES)[number]

export const TODO_CATEGORIES = ['personal', 'work', 'study', 'health', 'finance', 'other'] as const
export type TodoCategory = (typeof TODO_CATEGORIES)[number]

export const TODO_STATUSES = ['all', 'active', 'completed'] as const
export type TodoStatus = (typeof TODO_STATUSES)[number]

export const TODO_SORTS = ['newest', 'oldest', 'due', 'priority', 'title'] as const
export type TodoSort = (typeof TODO_SORTS)[number]

export const TODO_DUE_FILTERS = ['any', 'today', 'overdue', 'upcoming', 'none'] as const
export type TodoDueFilter = (typeof TODO_DUE_FILTERS)[number]

export const LIMITS = {
  title: 120,
  notes: 2000,
  tags: 5,
  tagLength: 20,
  subtasks: 20,
  bio: 160,
  fullName: 60,
  usernameMin: 3,
  usernameMax: 20,
  passwordMin: 8,
  passwordMax: 72, // bcrypt ignores bytes past 72
  avatarBytes: 2 * 1024 * 1024, // 2 MB
  avatarPixels: 512, // the browser crops to a 512×512 square before upload
} as const

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AvatarType = (typeof AVATAR_TYPES)[number]

// A "special character" is anything that isn't a letter, a digit or whitespace.
// Shared by the API and the password rule checklist so they can't disagree.
export const PASSWORD_SPECIAL = /[^\p{L}\p{N}\s]/u

export const RESERVED_USERNAMES = [
  'admin', 'administrator', 'api', 'app', 'auth', 'dashboard', 'taskora', 'help', 'login', 'logout',
  'me', 'new', 'profile', 'register', 'root', 'settings', 'signup', 'support', 'system',
  'tasks', 'user', 'users',
]

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/
