import { googleCallback } from '@/server/controllers/google.controller'

// Not wrapped in route(): failures must redirect to /login, not return JSON.
// It connects to the database itself (see googleCallbackUnsafe).
export const GET = googleCallback
