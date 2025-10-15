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

import { TopMatchesLeagues } from './globals/TopMatchesLeagues'
import { SidebarLeagues } from './globals/SidebarLeagues'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Posts, Comments, CommentVotes, Leagues, Matches, MatchStats, PredictionStats],
  globals: [TopMatchesLeagues, SidebarLeagues],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [payloadCloudPlugin()],
})
