import { NextRequest, type NextResponse } from 'next/server'

type Handler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<NextResponse>
type Json = { success: boolean; message: string; body?: any; details?: { path: string; message: string }[] }

/**
 * Calls App Router handlers directly — no server — and keeps ALL cookies
 * between calls like a browser (session + OAuth state). One TestClient =
 * one person's browser.
 */
export class TestClient {
  jar = new Map<string, string>()

  get cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ')
  }
  set cookie(value: string) {
    this.jar.clear()
    for (const part of value.split(';')) {
      const [k, ...v] = part.trim().split('=')
      if (k) this.jar.set(k, v.join('='))
    }
  }

  async raw(handler: Handler, method: string, url: string, body?: unknown, params: Record<string, string> = {}) {
    const init: { method: string; headers: Record<string, string>; body?: string } = {
      method,
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1', ...(this.jar.size ? { cookie: this.cookie } : {}) },
    }
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body)
    const res = await handler(new NextRequest(`http://localhost${url}`, init), { params: Promise.resolve(params) })
    for (const c of res.cookies.getAll()) {
      if (c.value && c.maxAge !== 0) this.jar.set(c.name, c.value)
      else this.jar.delete(c.name)
    }
    return res
  }

  async call(handler: Handler, method: string, url: string, body?: unknown, params: Record<string, string> = {}) {
    const res = await this.raw(handler, method, url, body, params)
    return { status: res.status, json: (await res.json()) as Json, cookieSet: res.cookies.get('taskora_session') }
  }
}
