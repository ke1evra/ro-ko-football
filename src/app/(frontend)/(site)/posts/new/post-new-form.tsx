'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createPostAction } from './post-server-actions'

export function NewPostForm() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return toast.error('Введите заголовок')
        if (!content.trim()) return toast.error('Введите содержимое')
        startTransition(async () => {
          const res = await createPostAction({ title, content })
          if (res.success && res.slug) {
            toast.success('Пост создан')
            window.location.href = `/posts/${res.slug}`
          } else {
            toast.error(res.error || 'Ошибка')
          }
        })
      }}
      className="grid gap-3 max-w-2xl"
    >
      <div className="grid gap-1">
        <label className="text-sm">Заголовок</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Текст</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Текст поста"
          rows={10}
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>Опубликовать</Button>
      </div>
    </form>
  )
}
