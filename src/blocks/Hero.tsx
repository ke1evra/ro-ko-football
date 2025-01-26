import { Section, Container, Craft } from '@/components/craft'
import type { Block } from 'payload'
import type { HeroBlock } from '@/payload-types'

export const HeroConfig: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      required: true,
    },
    {
      name: 'button',
      type: 'group',
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}

export const HeroOne = (props: HeroBlock) => {
  return (
    <Section>
      <Container className="space-y-6 md:space-y-12">
        <button>
          <a href={props.button.link}>{props.button.text}</a>
        </button>
        <Craft className="space-y-3">
          <h1>{props.title}</h1>
          <h3 className="text-muted-foreground">{props.subtitle}</h3>
        </Craft>
        <div className="relative h-[480px] w-full overflow-hidden rounded-lg border">
          <img
            src={props.image.url}
            width={props.image.width}
            height={props.image.height}
            alt={props.image.alt}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>
      </Container>
    </Section>
  )
}
