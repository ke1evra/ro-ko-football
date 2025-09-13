'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { CommentForm } from './post-comment-form'
import { toast } from 'sonner'
import { voteCommentAction } from './post-server-actions'

export type Comment = {
  id: string
  content: string
  createdAt: string
  author?: { email?: string } | string | null
  parent?: string | { id: string } | null
  upvotes?: number
  downvotes?: number
  score?: number
}

function buildTree(list: Comment[]) {
  const map: Record<string, any> = {}
  const roots: any[] = []
  list.forEach((c) => {
    map[c.id] = { ...c, children: [] }
  })
  list.forEach((c) => {
    const pid = typeof c.parent === 'object' ? (c.parent?.id as string | undefined) : c.parent
    if (pid) {
      const parent = map[pid]
      if (parent) parent.children.push(map[c.id])
      else roots.push(map[c.id]) // страхуемся
    } else {
      roots.push(map[c.id])
    }
  })
  return roots
}

export function CommentsTree({ postId, comments }: { postId: string; comments: Comment[] }) {
  const [local, setLocal] = useState<Comment[]>(comments)
  const [pending, startTransition] = useTransition()

  const tree = useMemo(() => buildTree(local), [local])

  function updateCounters(
    id: string,
    counters: { upvotes: number; downvotes: number; score: number },
  ) {
    setLocal((prev) => prev.map((c) => (c.id === id ? { ...c, ...counters } : c)))
  }

  return (
    <div className="grid gap-3">
      {tree.map((node: any) => (
        <CommentNode
          key={node.id}
          node={node}
          onReplySuccess={(newComment) => setLocal((prev) => [...prev, newComment])}
          onVoteSuccess={updateCounters}
          startTransition={startTransition}
          pending={pending}
        />
      ))}
      <div className="mt-2">
        <CommentForm
          postId={postId}
          onSuccess={(newComment) => {
            if (newComment) setLocal((prev) => [...prev, newComment])
          }}
        />
      </div>
    </div>
  )
}

function VoteButtons({
  commentId,
  upvotes = 0,
  downvotes = 0,
  score = 0,
  onDone,
  startTransition,
  pending,
}: {
  commentId: string
  upvotes?: number
  downvotes?: number
  score?: number
  onDone: (counters: { upvotes: number; downvotes: number; score: number }) => void
  startTransition: ReturnType<typeof useTransition>[1]
  pending: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await voteCommentAction({ commentId, value: 1 })
            if (res.success && res.counters) onDone(res.counters)
            else toast.error(res.error || 'Ошибка голосования')
          })
        }
      >
        + {upvotes}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await voteCommentAction({ commentId, value: -1 })
            if (res.success && res.counters) onDone(res.counters)
            else toast.error(res.error || 'Ошибка голосования')
          })
        }
      >
        − {downvotes}
      </Button>
      <span className="text-muted-foreground">счёт: {score}</span>
    </div>
  )
}

function CommentNode({
  node,
  onReplySuccess,
  onVoteSuccess,
  startTransition,
  pending,
}: {
  node: any
  onReplySuccess: (newComment: Comment) => void
  onVoteSuccess: (
    id: string,
    counters: { upvotes: number; downvotes: number; score: number },
  ) => void
  startTransition: ReturnType<typeof useTransition>[1]
  pending: boolean
}) {
  const [replyOpen, setReplyOpen] = useState(false)

  return (
    <div className="border rounded-md p-3">
      <div className="text-sm text-muted-foreground mb-1">
        {(node?.author?.email as string) || 'Аноним'} ·{' '}
        {format(new Date(node.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
      </div>
      <div className="text-sm mb-2">{node.content}</div>
      <div className="flex items-center gap-3">
        <VoteButtons
          commentId={node.id}
          upvotes={node.upvotes}
          downvotes={node.downvotes}
          score={node.score}
          onDone={(counters) => onVoteSuccess(node.id, counters)}
          startTransition={startTransition}
          pending={pending}
        />
        <Button variant="ghost" size="sm" onClick={() => setReplyOpen((s) => !s)}>
          Ответить
        </Button>
      </div>
      {replyOpen ? (
        <div className="mt-2">
          <CommentForm
            postId={(node as any).post?.id || ''}
            parentId={node.id}
            onSuccess={(newComment) => {
              if (newComment) onReplySuccess(newComment)
              setReplyOpen(false)
            }}
          />
        </div>
      ) : null}

      {Array.isArray(node.children) && node.children.length > 0 ? (
        <div className="mt-3 ml-4 border-l pl-3 space-y-3">
          {node.children.map((child: any) => (
            <CommentNode
              key={child.id}
              node={child}
              onReplySuccess={onReplySuccess}
              onVoteSuccess={onVoteSuccess}
              startTransition={startTransition}
              pending={pending}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
