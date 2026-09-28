import { startGoogle } from '@/server/controllers/google.controller'

// Not wrapped in route(): it's a browser redirect, needs no database, and
// must redirect to /login on failure rather than return JSON.
export const GET = startGoogle
