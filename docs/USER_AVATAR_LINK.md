# 🔗 Компонент UserAvatarLink

## Обзор

`UserAvatarLink` - это компонент, который оборачивает аватар пользователя в ссылку на его открытый профиль. При клике на аватар пользователь переходит на страницу `/profile/[username]`.

---

## Использование

### Базовое использование

```tsx
import { UserAvatarLink } from '@/components/UserAvatarLink'
import type { User } from '@/payload-types'

export function MyComponent({ user }: { user: User }) {
  return <UserAvatarLink user={user} />
}
```

### С размером

```tsx
<UserAvatarLink user={user} size="lg" />
```

### С именем пользователя

```tsx
<UserAvatarLink user={user} size="md" showName={true} />
```

### С кастомным классом

```tsx
<UserAvatarLink 
  user={user} 
  size="md" 
  className="custom-class"
  nameClassName="text-lg font-bold"
/>
```

---

## Props

```typescript
interface UserAvatarLinkProps {
  user: User | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showName?: boolean
  nameClassName?: string
}
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|---------|
| `user` | `User \| null \| undefined` | - | Объект пользователя |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Размер аватара |
| `className` | `string` | - | Кастомный класс для контейнера ссылки |
| `showName` | `boolean` | `false` | Показывать ли имя пользователя рядом с аватаром |
| `nameClassName` | `string` | - | Кастомный класс для имени пользователя |

---

## Размеры

| Размер | Класс | Пиксели |
|--------|-------|---------|
| `sm` | `h-6 w-6` | 24px |
| `md` | `h-8 w-8` | 32px |
| `lg` | `h-10 w-10` | 40px |
| `xl` | `h-16 w-16` | 64px |

---

## Примеры

### Пример 1: Аватар в списке постов

```tsx
import { UserAvatarLink } from '@/components/UserAvatarLink'

export function PostsList({ posts }) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="flex items-start gap-3">
          <UserAvatarLink user={post.author} size="md" />
          <div>
            <h3>{post.title}</h3>
            <p className="text-sm text-muted-foreground">
              {post.author?.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Пример 2: Аватар с именем

```tsx
import { UserAvatarLink } from '@/components/UserAvatarLink'

export function UserCard({ user }) {
  return (
    <div className="border rounded-lg p-4">
      <UserAvatarLink 
        user={user} 
        size="lg" 
        showName={true}
        nameClassName="text-lg font-semibold"
      />
      <p className="text-sm text-muted-foreground mt-2">
        {user.bio}
      </p>
    </div>
  )
}
```

### Пример 3: Аватар в комментарии

```tsx
import { UserAvatarLink } from '@/components/UserAvatarLink'

export function CommentItem({ comment }) {
  return (
    <div className="flex gap-3">
      <UserAvatarLink user={comment.author} size="sm" />
      <div className="flex-1">
        <p className="font-medium">{comment.author?.name}</p>
        <p className="text-sm">{comment.content}</p>
      </div>
    </div>
  )
}
```

### Пример 4: Аватар в карточке прогнозиста

```tsx
import { UserAvatarLink } from '@/components/UserAvatarLink'

export function PredictorCard({ predictor }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <UserAvatarLink user={predictor} size="lg" />
        <div>
          <h3 className="font-semibold">{predictor.name}</h3>
          <p className="text-sm text-muted-foreground">
            Hit Rate: {predictor.stats.hitRate}%
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## Поведение

### Если пользователь не авторизован

Если `user` равен `null` или `undefined`, компонент просто отображает обычный аватар без ссылки:

```tsx
<UserAvatarLink user={null} />
// Отображает: <Avatar>...</Avatar>
```

### Если username не указан

Если у пользователя нет `username`, компонент также отображает обычный аватар без ссылки:

```tsx
<UserAvatarLink user={{ name: 'John', email: 'john@example.com' }} />
// Отображает: <Avatar>...</Avatar>
```

### Если username указан

Компонент оборачивает аватар в ссылку на профиль:

```tsx
<UserAvatarLink user={{ username: 'john_doe', name: 'John' }} />
// Отображает: <Link href="/profile/john_doe"><Avatar>...</Avatar></Link>
```

---

## Стили

### Контейнер ссылки

```css
.user-avatar-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s;
}

.user-avatar-link:hover {
  opacity: 0.8;
}
```

### Имя пользователя

По умолчанию имя имеет класс `font-medium`. Можно переопределить через `nameClassName`:

```tsx
<UserAvatarLink 
  user={user} 
  showName={true}
  nameClassName="text-lg font-bold text-primary"
/>
```

---

## Интеграция

### Где используется

1. **Список постов** (`/posts/page.tsx`)
   - Аватар автора поста

2. **Страница поста** (`/posts/[slug]/page.tsx`)
   - Аватар автора в заголовке

3. **Карточка прогнозиста** (`PredictorCard.tsx`)
   - Аватар прогнозиста

---

## О��личие от UserAvatar

| Функция | UserAvatar | UserAvatarLink |
|---------|-----------|-----------------|
| Отображение аватара | ✅ | ✅ |
| Ссылка на профиль | ❌ | ✅ |
| Показ имени | ❌ | ✅ (опционально) |
| Кликабельность | ❌ | ✅ |

---

## Доступность

Компонент использует семантический HTML:

```tsx
<Link href={`/profile/${user.username}`}>
  <UserAvatar user={user} size={size} />
  {showName && <span>{user.name}</span>}
</Link>
```

- ✅ Семантическая ссылка (`<a>`)
- ✅ Правильная структура
- ✅ Поддержка клавиатуры
- ✅ Поддержка скринридеров

---

## Производительность

- ✅ Легкий компонент (просто обертка)
- ✅ Нет дополнительных запросов
- ✅ Использует существующий `UserAvatar`
- ✅ Оптимизирован для SSR

---

## Примеры в проекте

### 1. Список постов

```tsx
// src/app/(frontend)/(site)/posts/page.tsx
<UserAvatarLink user={author} size="md" />
```

### 2. Страница поста

```tsx
// src/app/(frontend)/(site)/posts/[slug]/page.tsx
<UserAvatarLink user={author} size="md" />
```

### 3. Карточка прогнозиста

```tsx
// src/components/predictions/PredictorCard.tsx
<UserAvatarLink user={author} size="lg" />
```

---

## Возможные улучшения

- [ ] Добавить tooltip с именем пользователя
- [ ] Добавить анимацию при наведении
- [ ] Добавить поддержку статуса онлайн
- [ ] Добавить контекстное меню
- [ ] Добавить предпросмотр профиля при наведении

---

## Файлы

```
src/
├── components/
│   ├── UserAvatar.tsx              (базовый компонент)
│   └── UserAvatarLink.tsx          ✅ НОВЫЙ
└── app/(frontend)/(site)/
    ├── posts/
    │   ├── page.tsx                ✅ ОБНОВЛЁН
    │   └── [slug]/page.tsx         ✅ ОБНОВЛЁН
    └── profile/
        └── [username]/page.tsx     (открытый профиль)

docs/
└── USER_AVATAR_LINK.md             ✅ НОВЫЙ
```

---

## Дополнительные ресурсы

- [Документация по профилю](./PROFILE_ROUTES_RESTRUCTURE.md)
- [Компонент UserAvatar](../src/components/UserAvatar.tsx)
- [Компонент PredictorCard](../src/components/predictions/PredictorCard.tsx)
