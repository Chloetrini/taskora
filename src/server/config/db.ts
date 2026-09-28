import 'server-only'
import mongoose from 'mongoose'
import { env } from './env'

/**
 * One shared connection per server instance. Cached on globalThis so Next's
 * dev hot-reload and warm serverless invocations reuse it instead of opening
 * a new pool every request (the Vercel cold-start lesson from Eventra).
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
const globalCache = globalThis as unknown as { __mongoose?: Cache }
const cache: Cache = (globalCache.__mongoose ??= { conn: null, promise: null })

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    const { MONGODB_URI, MONGODB_DB } = env()
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB,
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .catch(err => {
        cache.promise = null // allow a retry on the next request
        throw err
      })
  }
  cache.conn = await cache.promise
  return cache.conn
}
