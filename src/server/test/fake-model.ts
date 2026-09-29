// In-memory stand-in for a Mongoose model, implementing only the query
// shapes the controllers use. Lets the API run end-to-end in tests without
// a MongoDB server. If a controller starts using a new method or operator,
// add it here.
import { Types } from 'mongoose'

type Doc = Record<string, any>

const same = (a: unknown, b: unknown) => (a == null && b == null) || String(a) === String(b)

const matchValue = (actual: unknown, expected: unknown): boolean => {
  if (expected instanceof RegExp) {
    return Array.isArray(actual) ? actual.some(v => expected.test(String(v))) : expected.test(String(actual ?? ''))
  }
  if (expected && typeof expected === 'object' && !(expected instanceof Types.ObjectId)) {
    return Object.entries(expected as Doc).every(([op, v]) => {
      if (op === '$lt') return actual != null && (actual as any) < v
      if (op === '$gt') return actual != null && (actual as any) > v
      if (op === '$lte') return actual != null && (actual as any) <= v
      if (op === '$ne') return !same(actual, v)
      throw new Error(`fake-model: unsupported operator ${op}`)
    })
  }
  if (Array.isArray(actual)) return actual.some(v => same(v, expected))
  return same(actual, expected)
}

const matches = (doc: Doc, filter: Doc): boolean =>
  Object.entries(filter).every(([key, value]) =>
    key === '$or' ? (value as Doc[]).some(f => matches(doc, f)) : matchValue(doc[key], value)
  )

// structuredClone would strip ObjectId's prototype (String(id) breaks).
const clone = <T>(v: T): T => {
  if (v instanceof Types.ObjectId || v == null || typeof v !== 'object') return v
  if (v instanceof Uint8Array) return Buffer.from(v) as T
  if (v instanceof Date) return new Date(v) as T
  if (Array.isArray(v)) return v.map(clone) as T
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) as T
}

export function createFakeModel(options: { defaults: () => Doc; hidden?: string[] }) {
  let store: Doc[] = []
  const hidden = options.hidden ?? []

  const project = (doc: Doc | null, spec?: string): Doc | null => {
    if (!doc) return null
    const out = clone(doc)
    const parts = spec?.split(/\s+/).filter(Boolean) ?? []
    for (const h of hidden) if (!parts.includes(`+${h}`)) delete out[h]
    for (const p of parts) if (p.startsWith('-')) delete out[p.slice(1)]
    return out
  }

  const query = (run: () => Doc[] | Doc | null) => {
    let result = run()
    let spec: string | undefined
    const q: any = {
      sort(s: Doc) {
        const [[field, dir]] = Object.entries(s)
        result = [...(result as Doc[])].sort((a, b) => (a[field] - b[field]) * (dir as number))
        return q
      },
      limit(n: number) { result = (result as Doc[]).slice(0, n); return q },
      select(s: string) { spec = s; return q },
      lean() {
        const out = Array.isArray(result) ? result.map(d => project(d, spec)) : project(result, spec)
        const p: any = Promise.resolve(out)
        p.cursor = () => (async function* () { for (const d of out as Doc[]) yield d })()
        return p
      },
      then(resolve: any, reject: any) { return q.lean().then(resolve, reject) },
    }
    return q
  }

  let tick = 0
  const Model = {
    reset: () => { store = [] },
    all: () => store,
    find: (filter: Doc = {}) => query(() => store.filter(d => matches(d, filter))),
    findOne: (filter: Doc) => query(() => store.find(d => matches(d, filter)) ?? null),
    findById: (id: unknown) => query(() => store.find(d => same(d._id, id)) ?? null),
    exists: async (filter: Doc) => (store.some(d => matches(d, filter)) ? { _id: 'x' } : null),
    countDocuments: async (filter: Doc = {}) => store.filter(d => matches(d, filter)).length,
    create: async (input: Doc) => {
      const now = new Date(Date.now() + tick++)
      const doc = { _id: new Types.ObjectId(), ...options.defaults(), ...clone(input), createdAt: now, updatedAt: now, __v: 0 }
      store.push(doc)
      return { ...doc, toObject: () => clone(doc) }
    },
    findOneAndUpdate: (filter: Doc, update: { $set: Doc }) =>
      query(() => {
        const doc = store.find(d => matches(d, filter))
        if (doc) Object.assign(doc, clone(update.$set), { updatedAt: new Date() })
        return doc ?? null
      }),
    findByIdAndUpdate: (id: unknown, update: { $set: Doc }) => Model.findOneAndUpdate({ _id: id }, update),
    updateOne: async (filter: Doc, update: { $set: Doc }) => {
      const doc = store.find(d => matches(d, filter))
      if (doc) Object.assign(doc, update.$set)
      return { modifiedCount: doc ? 1 : 0 }
    },
    updateMany: async (filter: Doc, update: { $set: Doc }) => {
      const docs = store.filter(d => matches(d, filter))
      for (const doc of docs) Object.assign(doc, clone(update.$set))
      return { modifiedCount: docs.length }
    },
    findOneAndDelete: (filter: Doc) =>
      query(() => {
        const i = store.findIndex(d => matches(d, filter))
        return i === -1 ? null : store.splice(i, 1)[0]
      }),
    deleteOne: async (filter: Doc) => {
      const i = store.findIndex(d => matches(d, filter))
      if (i !== -1) store.splice(i, 1)
      return { deletedCount: i === -1 ? 0 : 1 }
    },
    deleteMany: async (filter: Doc) => {
      const before = store.length
      store = store.filter(d => !matches(d, filter))
      return { deletedCount: before - store.length }
    },
  }
  return Model
}

export const FakeUser = createFakeModel({ defaults: () => ({ bio: '', sessionVersion: 0 }), hidden: ['password', 'sessionVersion', 'googleId', 'avatar', 'verifyTokenHash', 'verifyTokenExpires', 'resetTokenHash', 'resetTokenExpires'] })
export const FakeTodo = createFakeModel({
  defaults: () => ({ notes: '', priority: 'medium', category: 'personal', tags: [], dueDate: null, subtasks: [], pinned: false, completed: false, completedAt: null, deletedAt: null }),
})
