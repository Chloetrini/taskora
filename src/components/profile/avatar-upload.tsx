'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useRemoveAvatar, useUploadAvatar } from '@/hooks/profile/use-profile'
import { checkAvatarFile, cropToSquare } from '@/lib/crop-image'
import { AVATAR_TYPES } from '@/constants/todo-values'
import type { User } from '@/types/user'

/** The big profile avatar with "Upload photo" / "Change photo" and "Remove photo". */
export function AvatarUpload({ user }: { user: User }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const [cropping, setCropping] = useState(false)
  const busy = cropping || upload.isPending || remove.isPending

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = '' // choosing the same file again still fires onChange
    if (!file) return
    const problem = checkAvatarFile(file)
    if (problem) return toast.error(problem)

    setCropping(true)
    let square: Blob
    try {
      square = await cropToSquare(file)
    } catch {
      return toast.error('We couldn’t read that image. Try a different photo.')
    } finally {
      setCropping(false)
    }
    upload.mutate(square, {
      onSuccess: () => toast.success('Photo updated'),
      onError: error => toast.error(error.message),
    })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="relative">
        <Avatar name={user.fullName} seed={user.username} src={user.avatarUrl} size="lg" className={busy ? 'opacity-60' : undefined} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={user.avatarUrl ? 'Change photo' : 'Upload photo'}
          className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
        >
          <Camera className="size-4" />
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={e => onFile(e.target.files?.[0])}
      />
      {user.avatarUrl && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => toast.success('Photo removed'),
              onError: error => toast.error(error.message),
            })
          }
        >
          <Trash2 /> {remove.isPending ? 'Removing…' : 'Remove photo'}
        </Button>
      )}
    </div>
  )
}
