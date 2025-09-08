'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createCommentAction } from './post-server-actions'
import { toast } from 'sonner'

export function CommentForm({ postId, parentId, onSuccess }: { postId: string; parentId?: string; onSuccess?: () => void }) {
  const [content, setContent] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!content.trim()) {
          toast.error('Введите текст комментария')
          return
        }
        startTransition(async () => {
          const res = await createCommentAction({ postId, content, parentId })
          if (res.success) {
            setContent('')
            toast.success('Комментарий добавлен')
            onSuccess?.()
          } else {
            toast.error(res.error || 'Ошибка')
          }
        })
      }}
      className="grid gap-2"
    >
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Ответить на комментарий...' : 'Написать комментарий...'}
      />
      <div>
        <Button type="submit" disabled={pending}>Отправить</Button>
      </div>
    </form>
  )
}
