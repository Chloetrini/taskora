import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { connectDB } from '@/server/config/db'
import { clearSessionCookie } from './session'

/*
 * Every API response has the same envelope:
 *   success: { success: true, message, body? }
 *   failure: { success: false, message, details?: [{ path, message }] }
 */

export type FieldIssue = { path: string; message: string }

export function ok<T>(message: string, body?: T, status = 200): NextResponse {
  return NextResponse.json(body === undefined ? { success: true, message } : { success: true, message, body }, { status })
}

export function fail(status: number, message: string, details?: FieldIssue[], code?: string): NextResponse {
  return NextResponse.json({ success: false, message, ...(details?.length ? { details } : {}), ...(code ? { code } : {}) }, { status })
}

/** Throw from anywhere in a handler; the route wrapper turns it into a response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: FieldIssue[],
    public clearSession = false,
    /** Machine-readable reason the UI can act on, e.g. 'email_not_verified'. */
    public code?: string
  ) {
    super(message)
  }
}

/** A field-level 4xx, e.g. conflict(409, 'username', 'That username is taken'). */
export const fieldError = (status: number, path: string, message: string) => new HttpError(status, message, [{ path, message }])

const zodIssues = (error: ZodError): FieldIssue[] =>
  error.issues.map(i => ({ path: i.path.map(String).join('.'), message: i.message }))

/** Parses + validates the JSON body. Bad JSON → 400, invalid → 400 with field details. */
export async function parseBody<S extends ZodType>(req: Request, schema: S) {
  let raw: unknown
  try {
    const text = await req.text()
    raw = text ? JSON.parse(text) : {}
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON')
  }
  const result = schema.safeParse(raw)
  if (!result.success) throw new HttpError(400, 'Validation failed', zodIssues(result.error))
  return result.data as import('zod').infer<S>
}

export function parseQuery<S extends ZodType>(req: NextRequest, schema: S) {
  const result = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!result.success) throw new HttpError(400, 'Invalid query parameters', zodIssues(result.error))
  return result.data as import('zod').infer<S>
}

type RouteContext<P> = { params: Promise<P> }
type Handler<P> = (req: NextRequest, ctx: RouteContext<P>) => Promise<NextResponse>

/**
 * Wraps every route handler: connects to MongoDB, then maps any thrown error
 * to the standard envelope. Handlers just `throw` — no try/catch in each one
 * (same idea as Eventra's tryCatchWrapper).
 */
export function route<P = Record<string, never>>(handler: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      await connectDB()
      return await handler(req, ctx)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    const res = fail(error.status, error.message, error.details, error.code)
    if (error.clearSession) clearSessionCookie(res)
    return res
  }
  if (error instanceof ZodError) return fail(400, 'Validation failed', zodIssues(error))

  const e = error as { name?: string; code?: number; keyPattern?: Record<string, unknown> }
  // Unique index race (two sign-ups with the same username at the same instant).
  if (e?.code === 11000) {
    const field = Object.keys(e.keyPattern ?? {})[0] ?? 'field'
    return fail(409, `That ${field} is already taken`, [{ path: field, message: `That ${field} is already taken` }])
  }
  if (e?.name === 'CastError') return fail(404, 'Not found')

  console.error('[api] Unhandled error:', error)
  const res = fail(500, 'Something went wrong on our side. Please try again.')
  // In development, say what actually broke (never in production — it can leak internals).
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ success: false, message: 'Something went wrong on our side. Please try again.', devDetail: describeError(error) }, { status: 500 })
  }
  return res
}

/** Human-readable cause for common setup mistakes (development only). */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/SESSION_SECRET/.test(message)) return message
  if (/MONGODB_URI/.test(message)) return message
  if (/ECONNREFUSED|ENOTFOUND|querySrv|Server selection timed out|MongoServerSelectionError|IP.*whitelist|not authorized|bad auth|Authentication failed/i.test(message)) {
    return `Can't connect to MongoDB: ${message}. Check MONGODB_URI in .env.local, the database user's password, and that your IP is allowed in Atlas → Network Access.`
  }
  return message
}
