'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/app/(frontend)/AuthContext'
import { updateProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AvatarUpload } from '@/components/AvatarUpload'
import { Container, Section } from '@/components/ds'

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth()
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
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        website: user.links?.website || '',
        twitter: user.links?.twitter || '',
        github: user.links?.github || '',
      })
    }
  }, [user, refreshKey])

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

  const handleAvatarUpdate = async () => {
    // Обновляем данные пользователя через AuthContext
    await refreshUser()
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <Section>
      <Container className="max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">Редактирование профиля</h1>
          <AvatarUpload user={user} onUpdate={handleAvatarUpdate} />
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Имя</label>
              <Input name="name" value={form.name} onChange={onChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input name="username" value={form.username} onChange={onChange} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">О себе</label>
            <Textarea
              name="bio"
              value={form.bio}
              onChange={onChange}
              placeholder="Расскажите немного о себе..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Внешний URL аватара
              <span className="text-xs text-muted-foreground ml-2">
                (используется, если не загружен файл)
              </span>
            </label>
            <Input
              name="avatarUrl"
              value={form.avatarUrl}
              onChange={onChange}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Социальные сети</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Сайт</label>
                <Input
                  name="website"
                  value={form.website}
                  onChange={onChange}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">X/Twitter</label>
                <Input
                  name="twitter"
                  value={form.twitter}
                  onChange={onChange}
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">GitHub</label>
                <Input
                  name="github"
                  value={form.github}
                  onChange={onChange}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
            {msg && (
              <div className={`text-sm ${msg === 'Сохранено' ? 'text-green-600' : 'text-red-600'}`}>
                {msg}
              </div>
            )}
          </div>
        </form>
      </Container>
    </Section>
  )
}
