'use client'

import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { ref?: Ref<HTMLInputElement> }

export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
