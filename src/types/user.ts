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
  /** False until the address is confirmed from the emailed link. */
  emailVerified: boolean
  /** A new address waiting for its confirmation link; `email` doesn't change until it's used. */
  pendingEmail: string | null
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

/** Registering creates the account but doesn't sign in: the address must be verified first. */
export interface RegisterResult {
  email: string
  /** False when the email provider failed; the page offers "Resend". */
  verificationSent: boolean
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
