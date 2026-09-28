// Mirrors the backend's public user (todo-backend toPublicUser) — never has a password.
export interface User {
  _id: string
  fullName: string
  username: string
  email: string
  bio: string
  /** False for accounts created with Google until they set a password. */
  hasPassword: boolean
  googleLinked: boolean
  /** Same-origin URL of the profile photo (versioned), or null for initials. */
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface RegisterInput {
  fullName: string
  username: string
  email: string
  password: string
}

export interface LoginInput {
  identifier: string
  password: string
}

export type UpdateProfileInput = Partial<Pick<User, 'fullName' | 'username' | 'email' | 'bio'>>

export interface UsernameAvailability {
  available: boolean
  reason?: string
}
