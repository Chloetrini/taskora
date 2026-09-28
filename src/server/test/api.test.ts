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
const googleStart = (await import('@/app/api/v1/auth/google/route')).GET
const googleCallback = (await import('@/app/api/v1/auth/google/callback/route')).GET

let n = 0
async function signedIn(overrides: Record<string, string> = {}) {
  n++
  const c = new TestClient()
  const res = await c.call(register, 'POST', '/api/v1/auth/register', {
    fullName: 'Chloe Test',
    username: `chloe${n}`,
    email: `chloe${n}@example.com`,
    password: 'supersecret1',
    ...overrides,
  })
  expect(res.status).toBe(201)
  return { c, user: res.json.body }
}

const check = (c: InstanceType<typeof TestClient>, name: string) =>
  c.call(usernameAvailable, 'GET', `/api/v1/users/username-available?username=${name}`).then(r => r.json.body)

const add = (c: InstanceType<typeof TestClient>, body: object) => c.call(todos.POST, 'POST', '/api/v1/todos', body).then(r => r.json.body)
const titles = (c: InstanceType<typeof TestClient>, qs: string) =>
  c.call(todos.GET, 'GET', `/api/v1/todos?${qs}`).then(r => r.json.body.todos.map((t: { title: string }) => t.title))

beforeEach(() => {
  FakeUser.reset()
  FakeTodo.reset()
  resetUsernameFilter()
  resetRateLimits()
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
  it('registers with an httpOnly encrypted session and never returns secrets', async () => {
    const c = new TestClient()
    const res = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'Chloe E', username: 'Chloe_Dev', email: 'c@x.com', password: 'supersecret1' })
    expect(res.status).toBe(201)
    expect(res.json.body.username).toBe('chloe_dev')
    expect(res.json.body.password).toBeUndefined()
    expect(res.json.body.sessionVersion).toBeUndefined()
    expect(res.cookieSet?.httpOnly).toBe(true)
    expect(res.cookieSet?.value).not.toContain('chloe') // sealed, not readable
    expect(FakeUser.all()[0].password).toMatch(/^\$2[aby]\$12\$/)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).json.body.username).toBe('chloe_dev')
  })

  it('rejects duplicate username/email with field details, and bad input', async () => {
    await signedIn({ username: 'taken', email: 'a@x.com' })
    const c = new TestClient()
    const dupUser = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'TAKEN', email: 'b@x.com', password: 'supersecret1' })
    expect(dupUser.status).toBe(409)
    expect(dupUser.json.details?.[0].path).toBe('username')
    const dupEmail = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'fresh', email: 'A@x.com', password: 'supersecret1' })
    expect(dupEmail.json.details?.[0].path).toBe('email')
    const bad = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: '1bad!', email: 'nope', password: 'short' })
    expect(bad.json.details?.map(d => d.path)).toEqual(expect.arrayContaining(['username', 'email', 'password']))
    const reserved = await c.call(register, 'POST', '/api/v1/auth/register', { fullName: 'B B', username: 'admin', email: 'z@x.com', password: 'supersecret1' })
    expect(reserved.json.details?.[0].message).toBe('That username is reserved')
  })

  it('logs in with email or username; one generic error', async () => {
    await signedIn({ username: 'loginme', email: 'login@x.com' })
    const c = new TestClient()
    expect((await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'LOGIN@x.com', password: 'supersecret1' })).status).toBe(200)
    expect((await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'loginme', password: 'supersecret1' })).status).toBe(200)
    const wrong = await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'loginme', password: 'nope-nope' })
    const ghost = await c.call(login, 'POST', '/api/v1/auth/login', { identifier: 'ghost', password: 'nope-nope' })
    expect(wrong.status).toBe(401)
    expect(ghost.json.message).toBe(wrong.json.message)
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
    await other.call(login, 'POST', '/api/v1/auth/login', { identifier: user.username, password: 'supersecret1' })
    expect((await other.call(me, 'GET', '/api/v1/auth/me')).status).toBe(200)

    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'wrong-one', newPassword: 'brandnew123' })).status).toBe(400)
    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { currentPassword: 'supersecret1', newPassword: 'brandnew123' })).status).toBe(200)

    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(200)
    expect((await other.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: user.username, password: 'brandnew123' })).status).toBe(200)
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
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1' })).status).toBe(200)
    expect(FakeUser.all()).toHaveLength(0)
    expect(FakeTodo.all()).toHaveLength(0)
    expect((await c.call(me, 'GET', '/api/v1/auth/me')).status).toBe(401)
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
    await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1' })
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
    await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { password: 'supersecret1' })
    expect(FakeTodo.all()).toHaveLength(0)
  })
})

describe('google sign-in', () => {
  const profile = { sub: 'google-123', email: 'Chloe.Egbukwu@gmail.com', email_verified: true, name: 'Chloe Egbukwu' }

  function mockGoogle(p: object = profile, tokenOk = true) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: URLSearchParams }) => {
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
    expect(me).toMatchObject({ username: 'chloeegbukwu', email: 'chloe.egbukwu@gmail.com', fullName: 'Chloe Egbukwu', hasPassword: false, googleLinked: true })
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

    const set = await c.call(password, 'PATCH', '/api/v1/users/me/password', { newPassword: 'mynewpass1' })
    expect(set.json.message).toBe('Password set')
    expect((await new TestClient().call(login, 'POST', '/api/v1/auth/login', { identifier: 'chloeegbukwu', password: 'mynewpass1' })).status).toBe(200)
    // now it has a password, so changing it requires the current one
    expect((await c.call(password, 'PATCH', '/api/v1/users/me/password', { newPassword: 'another123' })).status).toBe(400)
  })

  it('Google-only accounts confirm deletion with their username', async () => {
    mockGoogle()
    const { c } = await signInWithGoogle()
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { confirmUsername: 'nope' })).status).toBe(400)
    expect((await c.call(usersMe.DELETE, 'DELETE', '/api/v1/users/me', { confirmUsername: 'chloeegbukwu' })).status).toBe(200)
    expect(FakeUser.all()).toHaveLength(0)
  })
})
