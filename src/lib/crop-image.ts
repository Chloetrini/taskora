import { AVATAR_TYPES, LIMITS } from '@/constants/todo-values'

/** Client-side checks before any work; the server checks the real bytes again. */
export function checkAvatarFile(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'Choose a JPG, PNG or WebP image'
  if (file.size > LIMITS.avatarBytes) return 'Choose a photo under 2 MB'
  return null
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.9))

/**
 * Centre-crops an image to a square and scales it to LIMITS.avatarPixels,
 * so what we store is small and always square. Encodes as WebP, or JPEG where
 * the browser can't write WebP (older Safari hands back PNG instead).
 */
export async function cropToSquare(file: File): Promise<Blob> {
  // 'from-image' applies the EXIF rotation, so phone photos aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const size = Math.min(side, LIMITS.avatarPixels)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)

    const webp = await toBlob(canvas, 'image/webp')
    if (webp?.type === 'image/webp') return webp
    const jpeg = await toBlob(canvas, 'image/jpeg')
    if (!jpeg) throw new Error('Could not encode the image')
    return jpeg
  } finally {
    bitmap.close()
  }
}
