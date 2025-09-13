'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/app/(frontend)/AuthContext'
import { updateProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
    website: '',
    twitter: '',
    github: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        username: (user as unknown as { username?: string }).username || '',
        bio: (user as unknown as { bio?: string }).bio || '',
        avatarUrl: (user as unknown as { avatarUrl?: string }).avatarUrl || '',
        website: (user as unknown as { links?: { website?: string } }).links?.website || '',
        twitter: (user as unknown as { links?: { twitter?: string } }).links?.twitter || '',
        github: (user as unknown as { links?: { github?: string } }).links?.github || '',
      })
    }
  }, [user])

  if (isLoading) return <div className="container p-6">Загрузка...</div>
  if (!user) return <div className="container p-6">Требуется авторизация</div>

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await updateProfile({
      name: form.name,
      username: form.username,
      bio: form.bio,
      avatarUrl: form.avatarUrl || null,
      links: { website: form.website, twitter: form.twitter, github: form.github },
    })
    setSaving(false)
    setMsg(res.success ? 'Сохранено' : 'Ошибка сохранения')
  }

  return (
    <div className="container max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-6">Редактирование профиля</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Имя</label>
          <Input name="name" value={form.name} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <Input name="username" value={form.username} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">О себе</label>
          <Textarea name="bio" value={form.bio} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Avatar URL</label>
          <Input name="avatarUrl" value={form.avatarUrl} onChange={onChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Сайт</label>
            <Input name="website" value={form.website} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">X/Twitter</label>
            <Input name="twitter" value={form.twitter} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GitHub</label>
            <Input name="github" value={form.github} onChange={onChange} />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
      </form>
    </div>
  )
}
