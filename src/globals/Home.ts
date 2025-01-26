import { GlobalConfig } from 'payload'
import { HeroConfig } from '@/blocks/Hero'

export const Home: GlobalConfig = {
  slug: 'home',
  fields: [
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [HeroConfig],
    },
  ],
}
