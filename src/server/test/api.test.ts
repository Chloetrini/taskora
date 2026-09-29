import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/config/db', () => ({ connectDB: async () => undefined }))
vi.mock('@/server/models/user.model', async () => ({ default: (await import('./fake-model')).FakeUser }))
vi.mock('@/server/models/todo.model', async () => ({ default: (await import('./fake-model')).FakeTodo }))

const { FakeUser, FakeTodo } = await import('./fake-model')
const { TestClient } = await import('./client')
const { resetUsernameFilter, BloomFilter } = await import('@/server/services/username-bloom.service')
const { resetRateLimits } = await import('@/server/lib/rate-limit')

const register = (await import('@/app/api/v1/auth/register/route')).POST
const login = (await import('@/app/api/v1/auth/login/route')).POST
const logout = (await import('@/app/api/v1/auth/logout/route')).POST
const me = (await import('@/app/api/v1/auth/me/route')).GET
const me_ = me
const usernameAvailable = (await import('@/app/api/v1/users/username-available/route')).GET
const usersMe = await import('@/app/api/v1/users/me/route')
const password = (await import('@/app/api/v1/users/me/password/route')).PATCH
const todos = await import('@/app/api/v1/todos/route')
const stats = (await import('@/app/api/v1/todos/stats/route')).GET
const completed = (await import('@/app/api/v1/todos/completed/route')).DELETE
const todoById = await import('@/app/api/v1/todos/[id]/route')
const subtask = (await import('@/app/api/v1/todos/[id]/subtasks/[subtaskId]/route')).PATCH
const trash = await import('@/app/api/v1/todos/trash/route')
const restore = (await import('@/app/api/v1/todos/[id]/restore/route')).POST
const forever = (await import('@/app/api/v1/todos/[id]/permanent/route')).DELETE
const avatar = await import('@/app/api/v1/users/me/avatar/route')
const verifyEmail = (await import('@/app/api/v1/auth/verify-email/route')).POST
const resendVerification = (await import('@/app/api/v1/auth/resend-verification/route')).POST
const forgotPassword = (await import('@/app/api/v1/auth/forgot-password/route')).POST
const resetPassword = (await import('@/app/api/v1/auth/reset-password/route')).POST
const googleStart = (await import('@/app/api/v1/auth/google/route')).GET
const googleCallback = (await import('@/app/api/v1/auth/google/callback/route')).GET

// Every email the app "sends" lands here (Resend's HTTP API is stubbed in beforeEach).
type Sent = { from: string; to: string[]; subject: string; html: string; text: string }
const outbox: Sent[] = []
const lastEmail = (to?: string) => [...outbox].reverse().find(m => !to || m.to.includes(to))
const tokenOf = (mail: Sent) => new URL(/https?:\/\/\S+/.exec(mail.text)![0]).searchParams.get('token')!
const sentTo = (to: string) => outbox.filter(m => m.to.includes(to)).length

/** A person who has registered, confirmed their address, and logged in. */
let n = 0
async function signedIn(overrides: Record<string, string> = {}) {
  n++
  const c = new TestClient()
  const creds = {
    fullName: 'Chloe Test',
    username: `chloe${n}`,
    email: `chloe${n}@example.com`,
    password: 'supersecret1!',
    ...overrides,
  }
  const res = await c.call(register, 'POST', '/api/v1/auth/register', creds)
  expect(res.status).toBe(201)
  expect(res.cookieSet).toBeUndefined() // registering never signs anyone in
  // Confirm the address the way the emailed link would.
  FakeUser.all().find(u => u.email === creds.email.toLowerCase())!.emailVerified = true
  const session = await c.call(login, 'POST', '/api/v1/auth/login', { identifier: creds.username, password: creds.password })
  expect(session.status).toBe(200)
  return { c, user: session.json.body }
}

const check = (c: InstanceType<typeof TestClient>, name: string) =>
  c.call(usernameAvailable, 'GET', `/api/v1/users/username-available?username=${name}`).then(r => r.json.body)

const add = (c: InstanceType<typeof TestClient>, body: object) => c.call(todos.POST, 'POST', '/api/v1/todos', body).then(r => r.json.body)
const titles = (c: InstanceType<typeof TestClient>, qs: string) =>
  c.call(todos.GET, 'GET', `/api/v1/todos?${qs}`).then(r => r.json.body.todos.map((t: { title: string }) => t.title))

beforeEach(() => {
  outbox.length = 0
  vi.stubEnv('RESEND_API_KEY', 'test-key')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      if (!String(url).includes('api.resend.com')) throw new Error(`unexpected fetch: ${url}`)
      outbox.push(JSON.parse(String(init?.body)))
      return new Response('{"id":"email_1"}', { status: 200 })
    })
  )
  FakeUser.reset()
  FakeTodo.reset()
  resetUsernameFilter()
  resetRateLimits()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('bloom filter', () => {
  it('never gives a false negative', () => {
    const bloom = new BloomFilter(1000)
    const names = Array.from({ length: 1000 }, (_, i) => `user_${i}`)
    names.forEach(name => bloom.add(name))
    expect(names.every(name => bloom.mightContain(name))).toBe(true)
  })

  it('keeps false positives near the target rate', () => {
    const bloom = new BloomFilter(1000, 0.01)
    for (let i = 0; i < 1000; i++) bloom.add(`user_${i}`)
    let fp = 0
    for (let i = 0; i < 10000; i++) if (bloom.mightContain(`other_${i}`)) fp++
    expect(fp / 10000).toBeLessThan(0.03)
  })
})

describe('auth', () => {
  it('registers WITHOUT signing in, stores only a hashed password, and emails a verification link', async () => {
    const c = new TestClient()
    const res = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'Chloe E', username: 'Chloe_Dev', email: 'C@x.com', password: 'supersecret1!' })
    expect(res.status).toBe(201)
    expect(res.json.body).toEqual({ email: 'c@x.com', verificationSent: true })
    expect(res.cookieSet).toBeUndefined()
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)

    const [user] = FakeUser.all()
    expect(user.username).toBe('chloe_dev')
    expect(user.password).toMatch(/^\$2[aby]\$12\$/)
    expect(user.emailVerified).toBe(false)

    const mail = lastEmail('c@x.com')!
    expect(mail.subject).toBe('Verify your email for Taskora')
    expect(mail.from).toContain('Taskora')
    const token = tokenOf(mail)
    expect(mail.text).toContain('http://localhost:3000/verify-email?token=')
    expect(user.verifyTokenHash).toMatch(/^[a-f0-9]{64}$/) // a SHA-256, not the token
    expect(JSON.stringify(user)).not.toContain(token)
    expect(user.verifyTokenExpires.getTime() - Date.now()).toBeGreaterThan(23 * 3600_000)
  })

  it('rejects duplicate username/email with field details, and bad input', async () => {
    await signedIn({ username: 'taken', email: 'a@x.com' })
    const c = new TestClient()
    const dupUser = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'TAKEN', email: 'b@x.com', password: 'supersecret1!' })
    expect(dupUser.status).toBe(409)
    expect(dupUser.json.details?.[0].path).toBe('username')
    const dupEmail = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'fresh', email: 'A@x.com', password: 'supersecret1!' })
    expect(dupEmail.json.details?.[0].path).toBe('email')
    const bad = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: '1bad!', email: 'nope', password: 'short' })
    expect(bad.json.details?.map(d => d.path)).toEqual(expect.arrayContaining(['username', 'email', 'password']))
    const reserved = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'admin', email: 'z@x.com', password: 'supersecret1!' })
    expect(reserved.json.details?.[0].message).toBe('That username is reserved')
  })

  it('logs in with email or username; one generic error', async () => {
    await signedIn({ username: 'loginme', email: 'login@x.com' })
    const c = new TestClient()
    expect((await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'LOGIN@x.com', password: 'supersecret1!' })).status).toBe(200)
    expect((await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'loginme', password: 'supersecret1!' })).status).toBe(200)
    const wrong = await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'loginme', password: 'nope-nope' })
    const ghost = await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'ghost', password: 'nope-nope' })
    expect(wrong.status).toBe(401)
    expect(ghost.json.message).toBe(wrong.json.message)
  })

  it('requires a special character in new passwords, but never blocks login with an old one', async () => {
    const c = new TestClient()
    const weak = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'Weak Pass', username: 'weakpass', email: 'w@x.com', password: 'nospecial123' })
    expect(weak.status).toBe(400)
    expect(weak.json.details).toEqual([{ path: 'password', message: 'Include a special character, like ! @ # $ %' }])
    expect(FakeUser.all()).toHaveLength(0)
    for (const ok of ['pass word 1!', 'unicode-é1', 'tilde~tilde1', 'under_score1']) {
      FakeUser.reset()
      expect((await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'Ok Pass', username: 'okpass', email: 'o@x.com', password: ok })).status).toBe(201)
    }
    // Spaces and letters/digits alone are not "special".
    for (const bad of ['has space 123', 'lettersonlyhere', '12345678', 'ünïcödé123']) {
      expect((await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'Bad Pass', username: 'badpass', email: 'b2@x.com', password: bad })).status).toBe(400)
    }

    // An account from before the rule existed keeps working.
    await FakeUser.create({
      fullName: 'Old Timer',
      username: 'oldtimer',
      email: 'old@x.com',
      password: await bcrypt.hash('legacypassword1', 4),
      hasPassword: true,
      // no emailVerified field at all: created before verification existed
    })
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'oldtimer', password: 'legacypassword1' })).status).toBe(200)
  })

  it('rate limits repeated auth attempts', async () => {
    const c = new TestClient()
    let last = 0
    for (let i = 0; i < 11; i++) last = (await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'x', password: 'y' })).status
    expect(last).toBe(429)
  })

  it('logs out, clears the cookie, and blocks protected routes', async () => {
    const { c } = await signedIn()
    const out = await c.call(logout, 'POST', '/api/v1/auth/logout')
    expect(out.cookieSet?.maxAge).toBe(0)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
    expect((await c.call(todos.GET, 'GET', '/api/v1/todos')).status).toBe(401)
  })

  it('rejects a forged cookie and clears it', async () => {
    const c = new TestClient()
    c.cookie = 'taskora_session=forged-value'
    const res = await c.call(me, 'GET', '/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.cookieSet?.maxAge).toBe(0)
  })
})

describe('profile', () => {
  it('checks username availability (bloom filter + DB confirm)', async () => {
    const { c } = await signedIn({ username: 'alreadyhere' })
    const guest = new TestClient()
    expect(await check(guest, 'AlreadyHere')).toEqual({ available: false, reason: 'That username is taken' })
    expect((await check(guest, 'brandnew')).available).toBe(true)
    expect((await check(guest, 'ab')).available).toBe(false)
    expect((await check(c, 'alreadyhere')).available).toBe(true) // your own
  })

  it('edits username, name and bio; the old username frees up', async () => {
    const { c } = await signedIn({ username: 'oldname' })
    const res = await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { username: 'newname', fullName: 'Trinity Faith', bio: 'Building things' })
    expect(res.json.body).toMatchObject({ username: 'newname', fullName: 'Trinity Faith', bio: 'Building things' })
    const guest = new TestClient()
    expect((await check(guest, 'oldname')).available).toBe(true) // still in bloom filter; DB says free
    expect((await check(guest, 'newname')).available).toBe(false)
  })

  it("refuses someone else's username or email", async () => {
    await signedIn({ username: 'someoneelse', email: 'else@x.com' })
    const { c } = await signedIn()
    expect((await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { username: 'someoneelse' })).status).toBe(409)
    expect((await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'ELSE@x.com' })).status).toBe(409)
  })

  it('changes password, keeps this device signed in, signs out other devices', async () => {
    const { c, user } = await signedIn()
    const other = new TestClient()
    await other.call(login, 'POST', '/api/v1/auth/login', { identifier: user.username, password: 'supersecret1!' })
    expect((await other.call(me, 'GET', '/api/v1/auth/me')).status).toBe(200)

    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'wrong-one', newPassword: 'brandnew123!' })).status).toBe(400)
    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'supersecret1!', newPassword: 'brandnew123!' })).status).toBe(200)

    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(200)
    expect((await other.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: user.username, password: 'brandnew123!' })).status).toBe(200)
  })

  it('rejects a new password without a special character when changing it', async () => {
    const { c } = await signedIn()
    const res = await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'supersecret1!', newPassword: 'nospecial12345' })
    expect(res.status).toBe(400)
    expect(res.json.details?.[0]).toMatchObject({ path: 'newPassword', message: 'Include a special character, like ! @ # $ %' })
  })

  it('a new email waits in pendingEmail until its link is opened; login keeps working meanwhile', async () => {
    const { c, user } = await signedIn({ username: 'mover', email: 'old@example.com' })
    const res = await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'New@Example.com', bio: 'moving' })
    expect(res.status).toBe(200)
    expect(res.json.message).toContain('new@example.com')
    expect(res.json.body).toMatchObject({ email: 'old@example.com', pendingEmail: 'new@example.com', bio: 'moving' })
    expect(sentTo('new@example.com')).toBe(1)
    expect(sentTo('old@example.com')).toBe(1) // only the sign-up email; nothing went to the old address

    // Still logs in with the old address; the new one isn't theirs yet.
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'old@example.com', password: 'supersecret1!' })).status).toBe(200)
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'new@example.com', password: 'supersecret1!' })).status).toBe(401)

    const verified = await new TestClient().call(verifyEmail, 'POST', '/x', { token: tokenOf(lastEmail('new@example.com')!) })
    expect(verified.status).toBe(200)
    expect(verified.json.body).toEqual({ email: 'new@example.com' })
    const now = (await c.call(me, 'GET', '/api/v1/auth/me')).json.body
    expect(now).toMatchObject({ _id: user._id, email: 'new@example.com', pendingEmail: null, emailVerified: true })
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'new@example.com', password: 'supersecret1!' })).status).toBe(200)
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'old@example.com', password: 'supersecret1!' })).status).toBe(401)
  })

  it('typing the current email back cancels a pending change; someone else’s email is refused', async () => {
    await signedIn({ email: 'taken@example.com' })
    const { c } = await signedIn({ email: 'mine@example.com' })
    expect((await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'taken@example.com' })).status).toBe(409)
    await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'next@example.com' })
    const cancelled = await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'mine@example.com' })
    expect(cancelled.json.body).toMatchObject({ email: 'mine@example.com', pendingEmail: null })
  })

  it('if the new address is claimed before its link is used, the change fails', async () => {
    const { c } = await signedIn({ email: 'first@example.com' })
    await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { email: 'contested@example.com' })
    const token = tokenOf(lastEmail('contested@example.com')!)
    await signedIn({ email: 'contested@example.com' }) // someone else registers it first
    const res = await new TestClient().call(verifyEmail, 'POST', '/x', { token })
    expect(res.status).toBe(409)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body.email).toBe('first@example.com')
  })

  it('a password change also cancels an unused reset link', async () => {
    const { c, user } = await signedIn()
    await new TestClient().call(forgotPassword, 'POST', '/x', { email: user.email })
    const token = tokenOf(lastEmail(user.email)!)
    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'supersecret1!', newPassword: 'brandnew123!' })).status).toBe(200)
    expect((await new TestClient().call(resetPassword, 'POST', '/x', { token, newPassword: 'hijacked123!' })).status).toBe(400)
  })

  it('reports hasPassword from the password itself, even without the stored flag', async () => {
    // Accounts created before the hasPassword field existed have no flag.
    const { c, user } = await signedIn()
    const doc = FakeUser.all().find(u => String(u._id) === user._id)!
    delete doc.hasPassword
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body.hasPassword).toBe(true)
    const patched = await c.call(usersMe.PATCH, 'PATCH', '/api/v1/users/me', { bio: 'hi' })
    expect(patched.json.body.hasPassword).toBe(true)
  })

  it('deletes the account and all its tasks', async () => {
    const { c } = await signedIn()
    await add(c, { title: 'Goes away' })
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'wrong' })).status).toBe(400)
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1!' })).status).toBe(200)
    expect(FakeUser.all()).toHaveLength(0)
    expect(FakeTodo.all()).toHaveLength(0)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
  })
})

describe('email verification', () => {
  const creds = { fullName: 'New Person', username: 'newperson', email: 'new@x.com', password: 'supersecret1!' }
  const tryLogin = (identifier: string, pw = creds.password) => new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier, password: pw })

  async function signUp(overrides: Partial<typeof creds> = {}) {
    const res = await new TestClient().call(register, 'POST', '/api/v1/auth/register', { ...creds, ...overrides })
    expect(res.status).toBe(201)
    return tokenOf(lastEmail((overrides.email ?? creds.email).toLowerCase())!)
  }

  it('blocks login until the address is verified, then lets you in', async () => {
    const token = await signUp()

    const blocked = await tryLogin('new@x.com')
    expect(blocked.status).toBe(403)
    expect(blocked.json.code).toBe('email_not_verified')
    expect(blocked.json.message).toMatch(/verify your email/i)
    expect(blocked.cookieSet).toBeUndefined()
    expect((await tryLogin('newperson')).status).toBe(403) // by username too

    // The unverified state is only revealed to someone who knows the password.
    const wrong = await tryLogin('new@x.com', 'wrong-password!')
    const ghost = await tryLogin('nobody@x.com', 'wrong-password!')
    expect(wrong.status).toBe(401)
    expect(wrong.json.message).toBe(ghost.json.message)
    expect(wrong.json.code).toBeUndefined()

    const verified = await new TestClient().call(verifyEmail, 'POST', '/api/v1/auth/verify-email', { token })
    expect(verified.status).toBe(200)
    expect(verified.json.body).toEqual({ email: 'new@x.com' })
    expect(FakeUser.all()[0].verifyTokenHash).toBeNull()

    const ok = await tryLogin('new@x.com')
    expect(ok.status).toBe(200)
    expect(ok.json.body).toMatchObject({ username: 'newperson', emailVerified: true })
    expect(ok.json.body.verifyTokenHash).toBeUndefined()
  })

  it('links are single-use, expire, and a wrong token gets nothing', async () => {
    const token = await signUp()
    const verify = (t: string) => new TestClient().call(verifyEmail, 'POST', '/x', { token: t })

    expect((await verify('x'.repeat(43))).status).toBe(400) // right shape, wrong token
    expect((await verify('short')).status).toBe(400) // wrong shape
    expect((await verify(token)).status).toBe(200)
    const reuse = await verify(token)
    expect(reuse.status).toBe(400)
    expect(reuse.json.code).toBe('invalid_token')

    // Expired: a fresh account whose link is a day and a bit old.
    FakeUser.reset()
    const stale = await signUp()
    FakeUser.all()[0].verifyTokenExpires = new Date(Date.now() - 1000)
    const expired = await verify(stale)
    expect(expired.status).toBe(400)
    expect(expired.json.code).toBe('invalid_token')
    expect((await tryLogin('new@x.com')).status).toBe(403) // still unverified
  })

  it('resending gives a fresh link and kills the old one; the answer never reveals who has an account', async () => {
    const first = await signUp()
    const resend = (identifier: string) => new TestClient().call(resendVerification, 'POST', '/x', { identifier })

    const again = await resend('NewPerson')
    expect(again.status).toBe(200)
    expect(sentTo('new@x.com')).toBe(2)
    const second = tokenOf(lastEmail('new@x.com')!)
    expect(second).not.toBe(first)
    expect((await new TestClient().call(verifyEmail, 'POST', '/x', { token: first })).status).toBe(400)

    const ghost = await resend('ghost@x.com')
    expect(ghost.json.message).toBe(again.json.message)
    expect(outbox).toHaveLength(2) // nothing sent for an unknown account

    expect((await new TestClient().call(verifyEmail, 'POST', '/x', { token: second })).status).toBe(200)
    const done = await resend('new@x.com')
    expect(done.json.message).toBe(again.json.message)
    expect(outbox).toHaveLength(2) // and nothing for an account that is already verified
  })

  it('limits how often one address can be emailed', async () => {
    await signUp()
    const c = new TestClient()
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await c.call(resendVerification, 'POST', '/x', { identifier: 'new@x.com' })).status)
    expect(statuses).toEqual([200, 200, 200, 429])
    expect(sentTo('new@x.com')).toBe(4) // sign-up + 3 resends
  })

  it('accounts made before verification existed can still log in', async () => {
    await FakeUser.create({ fullName: 'Old Timer', username: 'oldtimer', email: 'old@x.com', password: await bcrypt.hash('legacypassword1', 4), hasPassword: true })
    const res = await tryLogin('old@x.com', 'legacypassword1')
    expect(res.status).toBe(200)
    expect(res.json.body.emailVerified).toBe(true)
  })

  it('a provider outage does not break sign-up: the account exists and "Resend" works later', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"provider down"}', { status: 500 })))
    const res = await new TestClient().call(register, 'POST', '/x', creds)
    expect(res.status).toBe(201)
    expect(res.json.body).toEqual({ email: 'new@x.com', verificationSent: false })
    expect(error).toHaveBeenCalled()
    expect(FakeUser.all()).toHaveLength(1)

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { body?: string }) => (outbox.push(JSON.parse(String(init?.body))), new Response('{}', { status: 200 }))))
    await new TestClient().call(resendVerification, 'POST', '/x', { identifier: 'new@x.com' })
    expect((await new TestClient().call(verifyEmail, 'POST', '/x', { token: tokenOf(lastEmail('new@x.com')!) })).status).toBe(200)
  })

  it('without an email provider: development prints the link, production refuses instead of pretending', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    const dev = await new TestClient().call(register, 'POST', '/x', creds)
    expect(dev.status).toBe(201)
    expect(dev.json.body.verificationSent).toBe(true)
    expect(String(info.mock.calls[0][0])).toContain('/verify-email?token=')
    expect(outbox).toHaveLength(0)

    FakeUser.reset()
    resetUsernameFilter()
    vi.stubEnv('NODE_ENV', 'production')
    const prod = await new TestClient().call(register, 'POST', '/x', creds)
    expect(prod.status).toBe(503)
    expect(FakeUser.all()).toHaveLength(0) // nothing half-created
    expect((await new TestClient().call(forgotPassword, 'POST', '/x', { email: 'new@x.com' })).status).toBe(503)
    expect((await new TestClient().call(resendVerification, 'POST', '/x', { identifier: 'new@x.com' })).status).toBe(503)
  })

  it('links point at APP_URL, never at the Host header the request arrived with', async () => {
    vi.stubEnv('APP_URL', 'https://taskora.example/')
    const req = new NextRequest('http://evil.example/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-for': '10.9.9.9' },
      body: JSON.stringify(creds),
    })
    expect((await register(req, { params: Promise.resolve({}) })).status).toBe(201)
    expect(lastEmail('new@x.com')!.text).toContain('https://taskora.example/verify-email?token=')
    expect(lastEmail('new@x.com')!.text).not.toContain('evil.example')
  })

  it('escapes the name in the HTML email', async () => {
    await signUp({ fullName: '<b>Bold</b> "Name"' })
    const html = lastEmail('new@x.com')!.html
    expect(html).not.toContain('<b>Bold</b>')
    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;')
  })

  it('signing in with Google proves the address: it verifies the account and discards a stranger’s password', async () => {
    // Someone registered this address with a password but never confirmed it.
    await signUp({ email: 'chloe.egbukwu@gmail.com', password: 'attackerpass1!' })
    const staleLink = tokenOf(lastEmail('chloe.egbukwu@gmail.com')!)
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) =>
          String(url).includes('oauth2.googleapis.com/token')
            ? new Response(JSON.stringify({ access_token: 'at' }), { status: 200 })
            : new Response(JSON.stringify({ sub: 'google-9', email: 'chloe.egbukwu@gmail.com', email_verified: true, name: 'Chloe Egbukwu' }), { status: 200 })
        )
      )
      const c = new TestClient()
      const start = await c.raw(googleStart, 'GET', '/api/v1/auth/google')
      const state = new URL(start.headers.get('location')!).searchParams.get('state')
      const cb = await c.raw(googleCallback, 'GET', `/api/v1/auth/google/callback?code=abc&state=${state}`)
      expect(cb.headers.get('location')).toContain('/dashboard')
      expect(FakeUser.all()).toHaveLength(1)
      expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body).toMatchObject({ googleLinked: true, emailVerified: true, hasPassword: false })
    } finally {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
    }
    expect((await tryLogin('chloe.egbukwu@gmail.com', 'attackerpass1!')).status).toBe(401) // their password is gone
    expect((await new TestClient().call(verifyEmail, 'POST', '/x', { token: staleLink })).status).toBe(400)
  })
})

describe('forgot and reset password', () => {
  const forgot = (email: string) => new TestClient().call(forgotPassword, 'POST', '/api/v1/auth/forgot-password', { email })
  const reset = (token: string, newPassword: string) => new TestClient().call(resetPassword, 'POST', '/api/v1/auth/reset-password', { token, newPassword })
  const tryLogin = (identifier: string, pw: string) => new TestClient().call(login, 'POST', '/x', { identifier, password: pw })

  it('gives the same answer for known and unknown emails, and only emails real accounts', async () => {
    const { user } = await signedIn()
    const before = outbox.length
    const ghost = await forgot('nobody@example.com')
    expect(ghost.status).toBe(200)
    expect(outbox).toHaveLength(before)

    const real = await forgot(user.email)
    expect(real.status).toBe(200)
    expect(real.json.message).toBe(ghost.json.message)
    expect(outbox).toHaveLength(before + 1)
    const mail = lastEmail(user.email)!
    expect(mail.subject).toBe('Reset your Taskora password')
    expect(mail.text).toContain('http://localhost:3000/reset-password?token=')
    expect(FakeUser.all()[0].resetTokenHash).toMatch(/^[a-f0-9]{64}$/) // stored hashed, never the token
    expect(JSON.stringify(FakeUser.all()[0])).not.toContain(tokenOf(mail))
    expect(FakeUser.all()[0].resetTokenExpires.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000)
    expect((await forgot('not-an-email')).status).toBe(400)
  })

  it('resets the password: old one stops working, every device is signed out, the link works once', async () => {
    const { c, user } = await signedIn()
    const other = new TestClient()
    await other.call(login, 'POST', '/x', { identifier: user.username, password: 'supersecret1!' })
    await forgot(user.email)
    const token = tokenOf(lastEmail(user.email)!)

    // A weak password is refused WITHOUT using up the link.
    const weak = await reset(token, 'nospecial12345')
    expect(weak.status).toBe(400)
    expect(weak.json.details?.[0].path).toBe('newPassword')
    expect((await reset(token, 'short!')).status).toBe(400)

    const done = await reset(token, 'a-brand-new-pass1')
    expect(done.status).toBe(200)
    expect(done.cookieSet).toBeUndefined() // not signed in; they log in with the new password
    expect((await tryLogin(user.username, 'supersecret1!')).status).toBe(401)
    expect((await tryLogin(user.email, 'a-brand-new-pass1')).status).toBe(200)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
    expect((await other.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)

    const reuse = await reset(token, 'another-new-pass1!')
    expect(reuse.status).toBe(400)
    expect(reuse.json.code).toBe('invalid_token')
    expect((await tryLogin(user.username, 'another-new-pass1!')).status).toBe(401)
  })

  it('rejects expired, wrong and wrong-kind tokens', async () => {
    const { user } = await signedIn()
    await forgot(user.email)
    const token = tokenOf(lastEmail(user.email)!)

    expect((await reset('y'.repeat(43), 'a-brand-new-pass1')).status).toBe(400)
    expect((await reset('short', 'a-brand-new-pass1')).status).toBe(400)
    FakeUser.all()[0].resetTokenExpires = new Date(Date.now() - 1000)
    const expired = await reset(token, 'a-brand-new-pass1')
    expect(expired.status).toBe(400)
    expect(expired.json.code).toBe('invalid_token')
    expect((await tryLogin(user.username, 'supersecret1!')).status).toBe(200) // password unchanged

    // An email-verification link can't be used to reset a password.
    FakeUser.reset()
    await new TestClient().call(register, 'POST', '/x', { fullName: 'Other One', username: 'otherone', email: 'other@x.com', password: 'supersecret1!' })
    expect((await reset(tokenOf(lastEmail('other@x.com')!), 'a-brand-new-pass1')).status).toBe(400)
  })

  it('a newer link replaces the older one', async () => {
    const { user } = await signedIn()
    await forgot(user.email)
    const first = tokenOf(lastEmail(user.email)!)
    await forgot(user.email)
    const second = tokenOf(lastEmail(user.email)!)
    expect(second).not.toBe(first)
    expect((await reset(first, 'a-brand-new-pass1')).status).toBe(400)
    expect((await reset(second, 'a-brand-new-pass1')).status).toBe(200)
  })

  it('resetting also proves the address, so someone who never verified can get back in', async () => {
    await new TestClient().call(register, 'POST', '/x', { fullName: 'Forgetful One', username: 'forgetful', email: 'f@x.com', password: 'supersecret1!' })
    expect((await tryLogin('forgetful', 'supersecret1!')).status).toBe(403)
    await forgot('f@x.com')
    expect((await reset(tokenOf(lastEmail('f@x.com')!), 'a-brand-new-pass1')).status).toBe(200)
    expect((await tryLogin('forgetful', 'a-brand-new-pass1')).status).toBe(200)
  })

  it('an unfinished email change is cancelled by a reset', async () => {
    const { c, user } = await signedIn()
    await c.call(usersMe.PATCH, 'PATCH', '/x', { email: 'sneaky@example.com' })
    const changeLink = tokenOf(lastEmail('sneaky@example.com')!)
    await forgot(user.email)
    expect((await reset(tokenOf(lastEmail(user.email)!), 'a-brand-new-pass1')).status).toBe(200)
    expect((await new TestClient().call(verifyEmail, 'POST', '/x', { token: changeLink })).status).toBe(400)
    expect(FakeUser.all()[0].email).toBe(user.email)
  })

  it('a Google-only account can use a reset link to set its first password', async () => {
    await FakeUser.create({ fullName: 'Goo Gle', username: 'googleonly', email: 'g@x.com', googleId: 'g-1', hasPassword: false, emailVerified: true })
    expect((await tryLogin('googleonly', 'anything123!')).status).toBe(401)
    await forgot('g@x.com')
    expect((await reset(tokenOf(lastEmail('g@x.com')!), 'a-brand-new-pass1')).status).toBe(200)
    expect((await tryLogin('googleonly', 'a-brand-new-pass1')).status).toBe(200)
  })

  it('limits how many reset emails one address can trigger', async () => {
    const { user } = await signedIn()
    const c = new TestClient()
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await c.call(forgotPassword, 'POST', '/x', { email: user.email })).status)
    expect(statuses).toEqual([200, 200, 200, 429])
  })
})

describe('profile photo', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9])
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 7])
  const url = '/api/v1/users/me/avatar'

  it('uploads, replaces and removes a photo; only the owner can fetch it', async () => {
    const { c, user } = await signedIn()
    expect(user.avatarUrl).toBeNull()

    const up = await c.upload(avatar.PUT, url, png, 'image/png')
    expect(up.status).toBe(200)
    expect(up.json.body.avatarUrl).toMatch(/^\/api\/v1\/users\/me\/avatar\?v=\d+$/)
    expect(up.json.body.avatar).toBeUndefined() // bytes never in the JSON
    const got = await c.raw(avatar.GET, 'GET', url)
    expect(got.status).toBe(200)
    expect(got.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(png)

    // Replace: the type comes from the bytes, not the header the browser sent.
    expect((await c.upload(avatar.PUT, url, jpeg, 'image/png')).status).toBe(200)
    expect((await c.raw(avatar.GET, 'GET', url)).headers.get('content-type')).toBe('image/jpeg')
    expect((await c.upload(avatar.PUT, url, webp, 'image/webp')).status).toBe(200)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body.avatarUrl).not.toBeNull()

    // Another user never sees it (the route only ever serves your own photo).
    const { c: other } = await signedIn()
    expect((await other.raw(avatar.GET, 'GET', url)).status).toBe(404)
    expect((await new TestClient().raw(avatar.GET, 'GET', url)).status).toBe(401)
    expect((await new TestClient().upload(avatar.PUT, url, png, 'image/png')).status).toBe(401)

    const removed = await c.call(avatar.DELETE, 'DELETE', url)
    expect(removed.json.body.avatarUrl).toBeNull()
    expect((await c.raw(avatar.GET, 'GET', url)).status).toBe(404)
  })

  it('checks the file type and size on the server', async () => {
    const { c } = await signedIn()
    const script = new TextEncoder().encode('<svg onload="alert(1)"></svg>')
    expect((await c.upload(avatar.PUT, url, script, 'image/png')).status).toBe(415)
    const gif = new TextEncoder().encode('GIF89a......')
    expect((await c.upload(avatar.PUT, url, gif, 'image/gif')).status).toBe(415)
    expect((await c.upload(avatar.PUT, url, new Uint8Array(), 'image/png')).status).toBe(400)
    const huge = new Uint8Array(2 * 1024 * 1024 + 1)
    huge.set(png)
    expect((await c.upload(avatar.PUT, url, huge, 'image/png')).status).toBe(413)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body.avatarUrl).toBeNull()
  })

  it('is deleted with the account', async () => {
    const { c } = await signedIn()
    await c.upload(avatar.PUT, url, png, 'image/png')
    await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1!' })
    expect(FakeUser.all()).toHaveLength(0)
  })
})

describe('todos', () => {
  it('requires login', async () => {
    expect((await new TestClient().call(todos.GET, 'GET', '/api/v1/todos')).status).toBe(401)
  })

  it('creates a full task, private to its owner', async () => {
    const a = await signedIn()
    const b = await signedIn()
    const todo = await add(a.c, {
      title: 'Ship HNG task',
      notes: 'Deploy it',
      priority: 'high',
      category: 'work',
      tags: ['HNG', 'hng', 'deploy'],
      dueDate: '2026-09-30',
      subtasks: [{ title: 'Build' }, { title: 'Deploy' }],
    })
    expect(todo.tags).toEqual(['hng', 'deploy'])
    expect(todo.subtasks).toHaveLength(2)
    expect(todo.userId).toBeUndefined()

    const p = { id: todo._id }
    expect((await b.c.call(todoById.GET, 'GET', `/api/v1/todos/${todo._id}`, undefined, p)).status).toBe(404)
    expect((await b.c.call(todoById.PATCH, 'PATCH', `/api/v1/todos/${todo._id}`, { completed: true }, p)).status).toBe(404)
    expect((await b.c.call(todoById.DELETE, 'DELETE', `/api/v1/todos/${todo._id}`, undefined, p)).status).toBe(404)
    expect(await titles(b.c, '')).toEqual([])
    expect((await a.c.call(todoById.GET, 'GET', `/api/v1/todos/${todo._id}`, undefined, p)).json.body.title).toBe('Ship HNG task')
  })

  it('toggles subtasks and completion', async () => {
    const { c } = await signedIn()
    const todo = await add(c, { title: 'T', subtasks: [{ title: 'one' }] })
    const sid = todo.subtasks[0]._id
    const toggled = await c.call(subtask, 'PATCH', `/x`, { done: true }, { id: todo._id, subtaskId: String(sid) })
    expect(toggled.json.body.subtasks[0].done).toBe(true)
    const done = await c.call(todoById.PATCH, 'PATCH', `/x`, { completed: true }, { id: todo._id })
    expect(done.json.body.completedAt).toBeTruthy()
  })

  it('filters by status, category, tag, due window and search', async () => {
    const { c } = await signedIn()
    const today = '2026-09-28'
    await add(c, { title: 'Overdue report', dueDate: '2026-09-20', category: 'work' })
    await add(c, { title: 'Today gym', dueDate: today, category: 'health', tags: ['fitness'] })
    await add(c, { title: 'Upcoming exam', dueDate: '2026-10-02', category: 'study' })
    await add(c, { title: 'Far away', dueDate: '2026-12-25' })
    await add(c, { title: 'No date at all', notes: 'remember MONGODB_URI' })

    const q = (s: string) => titles(c, `today=${today}&${s}`)
    expect(await q('due=overdue')).toEqual(['Overdue report'])
    expect(await q('due=today')).toEqual(['Today gym'])
    expect(await q('due=upcoming')).toEqual(['Upcoming exam'])
    expect(await q('due=none')).toEqual(['No date at all'])
    expect(await q('category=study')).toEqual(['Upcoming exam'])
    expect(await q('tag=fitness')).toEqual(['Today gym'])
    expect(await q('search=FITNESS')).toEqual(['Today gym'])
    expect(await q('search=mongodb_uri')).toEqual(['No date at all'])
    expect(await q('search=.*')).toEqual([])
  })

  it('sorts pinned first, then by the chosen sort', async () => {
    const { c } = await signedIn()
    await add(c, { title: 'b low', priority: 'low' })
    await add(c, { title: 'a high', priority: 'high' })
    await add(c, { title: 'c pinned low', priority: 'low', pinned: true })
    expect(await titles(c, 'sort=priority')).toEqual(['c pinned low', 'a high', 'b low'])
    expect(await titles(c, 'sort=title')).toEqual(['c pinned low', 'a high', 'b low'])
  })

  it('returns dashboard stats', async () => {
    const { c } = await signedIn()
    const today = '2026-09-28'
    await add(c, { title: 'x', dueDate: '2026-09-01', category: 'work', priority: 'high' })
    await add(c, { title: 'y', dueDate: today })
    const z = await add(c, { title: 'z' })
    await c.call(todoById.PATCH, 'PATCH', '/x', { completed: true }, { id: z._id })
    const s = (await c.call(stats, 'GET', `/api/v1/todos/stats?today=${today}`)).json.body
    expect(s).toMatchObject({ total: 3, completed: 1, active: 2, overdue: 1, dueToday: 1, completionRate: 33, completedThisWeek: 1 })
    expect(s.byCategory.work).toBe(1)
    expect(s.byPriority.high).toBe(1)
  })

  it('rejects bad input', async () => {
    const { c } = await signedIn()
    const t = await add(c, { title: 'x' })
    expect((await c.call(todos.POST, 'POST', '/api/v1/todos', { title: 'x', tags: ['1', '2', '3', '4', '5', '6'] })).status).toBe(400)
    expect((await c.call(todos.POST, 'POST', '/api/v1/todos', { title: 'x', dueDate: '2026-02-30' })).status).toBe(400)
    expect((await c.call(todoById.PATCH, 'PATCH', '/x', { userId: 'hijack' }, { id: t._id })).status).toBe(400)
    expect((await c.call(todoById.PATCH, 'PATCH', '/x', {}, { id: t._id })).status).toBe(400)
    expect((await c.call(todoById.PATCH, 'PATCH', '/x', { completed: true }, { id: 'not-an-id' })).status).toBe(400)
    expect((await c.call(todos.GET, 'GET', '/api/v1/todos?due=someday')).status).toBe(400)
    const badJson = await c.call(todos.POST, 'POST', '/api/v1/todos', '{bad')
    expect(badJson.json.message).toBe('Request body is not valid JSON')
  })

  it('clears only completed tasks', async () => {
    const { c } = await signedIn()
    const d = await add(c, { title: 'done' })
    await add(c, { title: 'not done' })
    await c.call(todoById.PATCH, 'PATCH', '/x', { completed: true }, { id: d._id })
    expect((await c.call(completed, 'DELETE', '/api/v1/todos/completed')).json.body.deletedCount).toBe(1)
    expect(await titles(c, '')).toEqual(['not done'])
    expect(FakeTodo.all()).toHaveLength(2) // cleared tasks go to the trash, not away
    const inTrash = (await c.call(trash.GET, 'GET', '/api/v1/todos/trash')).json.body.todos
    expect(inTrash.map((t: { title: string }) => t.title)).toEqual(['done'])
  })
})

describe('trash', () => {
  const trashTitles = (c: InstanceType<typeof TestClient>) =>
    c.call(trash.GET, 'GET', '/api/v1/todos/trash').then(r => r.json.body.todos.map((t: { title: string }) => t.title))

  it('delete moves a task to the trash; it vanishes from lists, stats and edits', async () => {
    const { c } = await signedIn()
    const t = await add(c, { title: 'Binned', tags: ['x'], subtasks: [{ title: 'step' }] })
    await add(c, { title: 'Kept' })
    const p = { id: t._id }
    const del = await c.call(todoById.DELETE, 'DELETE', '/x', undefined, p)
    expect(del.status).toBe(200)
    expect(del.json.message).toBe('Task moved to trash')

    expect(await titles(c, '')).toEqual(['Kept'])
    expect(await titles(c, 'tag=x')).toEqual([])
    expect((await c.call(stats, 'GET', '/api/v1/todos/stats')).json.body.total).toBe(1)
    expect((await c.call(todoById.GET, 'GET', '/x', undefined, p)).status).toBe(404)
    expect((await c.call(todoById.PATCH, 'PATCH', '/x', { completed: true }, p)).status).toBe(404)
    expect((await c.call(subtask, 'PATCH', '/x', { done: true }, { id: t._id, subtaskId: t.subtasks[0]._id })).status).toBe(404)
    expect((await c.call(todoById.DELETE, 'DELETE', '/x', undefined, p)).status).toBe(404) // already in trash

    const inTrash = (await c.call(trash.GET, 'GET', '/api/v1/todos/trash')).json.body.todos
    expect(inTrash).toHaveLength(1)
    expect(inTrash[0]).toMatchObject({ title: 'Binned', tags: ['x'] })
    expect(inTrash[0].deletedAt).toBeTruthy()
    expect(inTrash[0].userId).toBeUndefined()
  })

  it('restores a task exactly as it was', async () => {
    const { c } = await signedIn()
    const t = await add(c, { title: 'Come back', priority: 'high', dueDate: '2030-01-02', pinned: true })
    await c.call(todoById.DELETE, 'DELETE', '/x', undefined, { id: t._id })
    const res = await c.call(restore, 'POST', '/x', undefined, { id: t._id })
    expect(res.status).toBe(200)
    expect(res.json.body).toMatchObject({ title: 'Come back', priority: 'high', dueDate: '2030-01-02', pinned: true, deletedAt: null })
    expect(await titles(c, '')).toEqual(['Come back'])
    expect(await trashTitles(c)).toEqual([])
    // A live task can't be "restored"
    expect((await c.call(restore, 'POST', '/x', undefined, { id: t._id })).status).toBe(404)
  })

  it('deletes forever only from the trash, and empties the trash', async () => {
    const { c } = await signedIn()
    const a = await add(c, { title: 'A' })
    const b = await add(c, { title: 'B' })
    const live = await add(c, { title: 'Live' })
    // A live task can't skip the trash.
    expect((await c.call(forever, 'DELETE', '/x', undefined, { id: live._id })).status).toBe(404)

    await c.call(todoById.DELETE, 'DELETE', '/x', undefined, { id: a._id })
    await new Promise(r => setTimeout(r, 5)) // distinct deletedAt timestamps
    await c.call(todoById.DELETE, 'DELETE', '/x', undefined, { id: b._id })
    expect(await trashTitles(c)).toEqual(['B', 'A']) // most recently deleted first

    expect((await c.call(forever, 'DELETE', '/x', undefined, { id: a._id })).status).toBe(200)
    expect(await trashTitles(c)).toEqual(['B'])
    expect((await c.call(restore, 'POST', '/x', undefined, { id: a._id })).status).toBe(404) // gone for good

    const emptied = await c.call(trash.DELETE, 'DELETE', '/api/v1/todos/trash')
    expect(emptied.json.body.deletedCount).toBe(1)
    expect(await trashTitles(c)).toEqual([])
    expect(FakeTodo.all().map(t => t.title)).toEqual(['Live'])
  })

  it("keeps each user's trash private", async () => {
    const a = await signedIn()
    const b = await signedIn()
    const t = await add(a.c, { title: 'Secret' })
    await a.c.call(todoById.DELETE, 'DELETE', '/x', undefined, { id: t._id })

    expect(await trashTitles(b.c)).toEqual([])
    expect((await b.c.call(restore, 'POST', '/x', undefined, { id: t._id })).status).toBe(404)
    expect((await b.c.call(forever, 'DELETE', '/x', undefined, { id: t._id })).status).toBe(404)
    expect((await b.c.call(trash.DELETE, 'DELETE', '/api/v1/todos/trash')).json.body.deletedCount).toBe(0)
    expect(await trashTitles(a.c)).toEqual(['Secret'])
    expect((await new TestClient().call(trash.GET, 'GET', '/api/v1/todos/trash')).status).toBe(401)
  })

  it('deleting the account also deletes the trash', async () => {
    const { c } = await signedIn()
    const t = await add(c, { title: 'Trashed' })
    await c.call(todoById.DELETE, 'DELETE', '/x', undefined, { id: t._id })
    await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1!' })
    expect(FakeTodo.all()).toHaveLength(0)
  })
})

describe('google sign-in', () => {
  const profile = { sub: 'google-123', email: 'Chloe.Egbukwu@gmail.com', email_verified: true, name: 'Chloe Egbukwu' }

  function mockGoogle(p: object = profile, tokenOk = true) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: URLSearchParams | string }) => {
        if (url.includes('api.resend.com')) {
          outbox.push(JSON.parse(String(init?.body)))
          return new Response('{"id":"email_1"}', { status: 200 })
        }
        if (url.includes('oauth2.googleapis.com/token')) {
          // PKCE: the verifier must be sent with the code
          expect(String(init?.body)).toContain('code_verifier=')
          return new Response(JSON.stringify(tokenOk ? { access_token: 'at' } : { error: 'bad' }), { status: tokenOk ? 200 : 400 })
        }
        return new Response(JSON.stringify(p), { status: 200 })
      })
    )
  }

  /** Runs start → callback in one browser; returns the final redirect. */
  async function signInWithGoogle(c = new TestClient(), opts: { tamperState?: boolean } = {}) {
    const start = await c.raw(googleStart, 'GET', '/api/v1/auth/google?next=/tasks')
    const to = new URL(start.headers.get('location')!)
    expect(to.origin).toBe('https://accounts.google.com')
    expect(to.searchParams.get('code_challenge_method')).toBe('S256')
    const state = opts.tamperState ? 'wrong' : to.searchParams.get('state')
    const cb = await c.raw(googleCallback, 'GET', `/api/v1/auth/google/callback?code=abc&state=${state}`)
    return { c, location: cb.headers.get('location') ?? '' }
  }

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
  })

  it('creates an account with a generated username and signs in', async () => {
    mockGoogle()
    const { c, location } = await signInWithGoogle()
    expect(new URL(location).pathname).toBe('/tasks') // honours ?next
    const me = (await c.call((await import('@/app/api/v1/auth/me/route')).GET, 'GET', '/api/v1/auth/me')).json.body
    expect(me).toMatchObject({ username: 'chloeegbukwu', email: 'chloe.egbukwu@gmail.com', fullName: 'Chloe Egbukwu', hasPassword: false, googleLinked: true, emailVerified: true })
    expect(me.googleId).toBeUndefined()
  })

  it('gives a free username when the obvious one is taken', async () => {
    await signedIn({ username: 'chloeegbukwu', email: 'someone@else.com' })
    mockGoogle()
    const { c } = await signInWithGoogle()
    const me = (await c.call(me_, 'GET', '/api/v1/auth/me')).json.body
    expect(me.username).toMatch(/^chloeegbukwu\d{4}$/)
  })

  it('links to an existing account with the same verified email, and finds it again by Google id', async () => {
    const { user } = await signedIn({ email: 'chloe.egbukwu@gmail.com' })
    mockGoogle()
    const first = await signInWithGoogle()
    expect((await first.c.call(me_, 'GET', '/api/v1/auth/me')).json.body._id).toBe(user._id)
    expect(FakeUser.all()).toHaveLength(1)
    mockGoogle({ ...profile, email: 'changed@gmail.com' }) // email changed at Google; id still matches
    const second = await signInWithGoogle()
    expect((await second.c.call(me_, 'GET', '/api/v1/auth/me')).json.body._id).toBe(user._id)
  })

  it('rejects a wrong state, an unverified email, and a failed token exchange', async () => {
    mockGoogle()
    expect((await signInWithGoogle(undefined, { tamperState: true })).location).toContain('/login?error=google_failed')
    mockGoogle({ ...profile, email_verified: false })
    expect((await signInWithGoogle()).location).toContain('/login?error=google_unverified')
    mockGoogle(profile, false)
    expect((await signInWithGoogle()).location).toContain('/login?error=google_failed')
    expect(FakeUser.all()).toHaveLength(0)
  })

  it('never shows an error page: a crash mid-flow redirects to login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const c = new TestClient()
    const start = await c.raw(googleStart, 'GET', '/api/v1/auth/google')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')
    const cb = await c.raw(googleCallback, 'GET', `/api/v1/auth/google/callback?code=abc&state=${state}`)
    expect(cb.status).toBe(307)
    expect(cb.headers.get('location')).toContain('/login?error=google_failed')
  })

  it('redirects to login when Google is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    const res = await new TestClient().raw(googleStart, 'GET', '/api/v1/auth/google')
    expect(res.headers.get('location')).toContain('/login?error=google_unavailable')
  })

  it('Google-only accounts: no password login, can set a password, delete by typing username', async () => {
    mockGoogle()
    const { c } = await signInWithGoogle()
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'chloeegbukwu', password: 'anything12' })).status).toBe(401)

    const set = await c.call(password, 'PATCH', '/api/v1/users/me/password', { newPassword: 'mynewpass1!' })
    expect(set.json.message).toBe('Password set')
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'chloeegbukwu', password: 'mynewpass1!' })).status).toBe(200)
    // now it has a password, so changing it requires the current one
    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { newPassword: 'another123!' })).status).toBe(400)
  })

  it('Google-only accounts confirm deletion with their username', async () => {
    mockGoogle()
    const { c } = await signInWithGoogle()
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { confirmUsername: 'nope' })).status).toBe(400)
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { confirmUsername: 'chloeegbukwu' })).status).toBe(200)
    expect(FakeUser.all()).toHaveLength(0)
  })
})
