import { GlobalConfig } from 'payload'
import { HeroConfig } from '@/blocks/HeroBlock'

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
