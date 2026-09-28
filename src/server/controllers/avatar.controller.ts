import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { HttpError, ok } from '@/server/lib/http'
import { requireUser, toPublicUser } from '@/server/lib/auth'
import { LIMITS as RATE_LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { LIMITS, type AvatarType } from '@/constants/todo-values'

const TOO_BIG = 'Choose a photo under 2 MB'
const WRONG_TYPE = 'Choose a JPG, PNG or WebP image'

/**
 * The real file type, read from the file's first bytes. The browser's
 * Content-Type header and file name are never trusted.
 */
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b)
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

// Lean reads return BSON Binary for Buffer paths; hydrated/fake ones return a Buffer.
const toBuffer = (data: unknown): Buffer =>
  Buffer.isBuffer(data) ? data : data instanceof Uint8Array ? Buffer.from(data) : Buffer.from((data as { buffer: Uint8Array }).buffer)

/** PUT /users/me/avatar — the body is the raw image (the browser has already cropped it square). */
export async function uploadAvatar(req: NextRequest) {
  const { userId } = await requireUser(req)
  rateLimit(`avatar:${userId}`, RATE_LIMITS.avatar.limit, RATE_LIMITS.avatar.windowMs)

  // Refuse an oversized upload before reading it, then check the real size.
  if (Number(req.headers.get('content-length') ?? 0) > LIMITS.avatarBytes) throw new HttpError(413, TOO_BIG)
  const bytes = Buffer.from(await req.arrayBuffer())
  if (bytes.length === 0) throw new HttpError(400, 'Choose a photo to upload')
  if (bytes.length > LIMITS.avatarBytes) throw new HttpError(413, TOO_BIG)
  const contentType = sniffImageType(bytes)
  if (!contentType) throw new HttpError(415, WRONG_TYPE)

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { avatar: { data: bytes, contentType }, avatarUpdatedAt: new Date() } },
    { new: true }
  )
    .select('+googleId +password')
    .lean()
  if (!user) throw new HttpError(404, 'Account not found')
  return ok('Photo updated', toPublicUser(user))
}

/** DELETE /users/me/avatar — back to initials. */
export async function removeAvatar(req: NextRequest) {
  const { userId } = await requireUser(req)
  rateLimit(`avatar:${userId}`, RATE_LIMITS.avatar.limit, RATE_LIMITS.avatar.windowMs)

  const user = await User.findByIdAndUpdate(userId, { $set: { avatar: null, avatarUpdatedAt: null } }, { new: true })
    .select('+googleId +password')
    .lean()
  if (!user) throw new HttpError(404, 'Account not found')
  return ok('Photo removed', toPublicUser(user))
}

/**
 * GET /users/me/avatar — only ever the signed-in user's own photo (the
 * tenant comes from the session). The URL carries ?v=<updatedAt>, so the
 * browser may cache it for good; a new photo gets a new URL.
 */
export async function getAvatar(req: NextRequest) {
  const { userId } = await requireUser(req)
  const user = await User.findById(userId).select('+avatar').lean()
  if (!user?.avatar?.data) throw new HttpError(404, 'No photo')

  const bytes = toBuffer(user.avatar.data)
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': user.avatar.contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
      // Served from our origin: never let it be treated as anything but an image.
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
