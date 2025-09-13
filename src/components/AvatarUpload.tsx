'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'
import type { User } from '@/payload-types'
import { updateProfile } from '@/lib/profile'

interface AvatarUploadProps {
  user: User
  onUpdate?: () => void
}

export function AvatarUpload({ user, onUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Создаем FormData для загрузки файла
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', `Аватар пользователя ${user.name || user.email}`)

      // Загружаем файл в коллекцию media
      const uploadResponse = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const uploadResult = await uploadResponse.json()

      // Обновляем профиль пользователя с новым аватаром
      const updateResult = await updateProfile({
        avatar: uploadResult.doc.id,
      })

      if (!updateResult.success) {
        throw new Error('Ошибка обновления профиля')
      }

      // Вызываем callback для обновления UI
      onUpdate?.()
    } catch (err) {
      console.error('Avatar upload error:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке')
    } finally {
      setUploading(false)
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    setError(null)

    try {
      const result = await updateProfile({
        avatar: null,
        avatarUrl: null,
      })

      if (!result.success) {
        throw new Error('Ошибка удаления аватара')
      }

      onUpdate?.()
    } catch (err) {
      console.error('Avatar remove error:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <UserAvatar user={user} size="xl" />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          disabled={uploading}
        >
          {uploading ? 'Загрузка...' : 'Изменить аватар'}
        </Button>

        {user.avatar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            Удалить
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  )
}
