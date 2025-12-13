import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { fileURLToPath } from 'url'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import sharp from 'sharp'
import path from 'node:path'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Comments } from './collections/Comments'
import { CommentVotes } from './collections/CommentVotes'
import { Leagues } from './collections/Leagues'
import { Matches } from './collections/Matches'
import { MatchStats } from './collections/MatchStats'
import { PredictionStats } from './collections/PredictionStats'
import { Markets } from './collections/Markets'
import { OutcomeGroups } from './collections/OutcomeGroups'

import { TopMatchesLeagues } from './globals/TopMatchesLeagues'
import { SidebarLeagues } from './globals/SidebarLeagues'
import { OutcomeManager } from './globals/OutcomeManager'
import { HeaderMenu } from './globals/HeaderMenu'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Настройки админ-панели
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Футбольная платформа',
      description: 'Система управления контентом для футбольной платформы',
    },
  },
  // Коллекции данных (основные сущности системы)
  collections: [
    Users, // Пользователи и аутентификация
    Media, // Медиафайлы (изображения, документы)
    Posts, // Публикации и новости
    Comments, // Комментарии к публикациям
    CommentVotes, // Голоса за комментарии
    Leagues, // Футбольные лиги
    Matches, // Матчи
    MatchStats, // Статистика матчей
    PredictionStats, // Статистика прогнозов
    Markets, // Рынки ставок
    OutcomeGroups, // Группы исходов
  ],
  // Глобальные настройки (единичные документы)
  globals: [
    TopMatchesLeagues, // Топ-лиги для главной страницы
    SidebarLeagues, // Лиги для бокового меню
    OutcomeManager, // Управление исходами ставок
    HeaderMenu, // Меню в шапке сайта
  ],
  // Редактор контента (Lexical - современный rich-text редактор)
  editor: lexicalEditor(),
  // Секретный ключ для шифрования (обязательно задать в .env)
  secret: process.env.PAYLOAD_SECRET || '',
  // Настройки TypeScript (автогенерация типов)
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Подключение к MongoDB через Mongoose
  db: mongooseAdapter({
    url:
      process.env.NODE_ENV === 'development' && process.env.MONGODB_URI_LOCAL
        ? process.env.MONGODB_URI_LOCAL // Локальная БД для разработки
        : process.env.DATABASE_URI ||
          process.env.MONGODB_URI ||
          process.env.PAYLOAD_MONGODB_URL ||
          '',
  }),
  // Sharp для обработки изображений (ресайз, оптимизация)
  sharp,
  // Плагины (Payload Cloud для хостинга)
  plugins: [payloadCloudPlugin()],
})
