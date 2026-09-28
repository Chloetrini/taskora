import { NextResponse, type NextRequest } from 'next/server'

// Must match SESSION_COOKIE in src/server/lib/session.ts. Duplicated (not
// imported) because proxy runs separately and shouldn't pull in server code.
const SESSION_COOKIE = 'taskora_session'

const APP_PATHS = ['/dashboard', '/tasks', '/profile']
const GUEST_PATHS = ['/login', '/register']

/**
 * Fast redirects based only on whether a session cookie EXISTS — it doesn't
 * decrypt or check the DB. Real authorization happens in every API route
 * (requireUser). A stale cookie gets cleared by the API on its first 401,
 * so it can't cause a redirect loop.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  if (!hasSession && APP_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }
  if (hasSession && GUEST_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/tasks/:path*', '/profile/:path*', '/login', '/register'],
}
