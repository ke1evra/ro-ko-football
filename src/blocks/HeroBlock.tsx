import { Section, Container, Craft } from '@/components/craft'
import { Button } from '@/components/ui/button'
import type { Block } from 'payload'
import type { HeroBlock as HeroBlockProps } from '@/payload-types'

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

export const HeroBlock = (props: HeroBlockProps) => {
  return (
    <Section>
      <Container className="space-y-6 md:space-y-12">
        <Button variant="outline" size="sm">
          <a href={props.button.link}>{props.button.text}</a>
        </Button>
        <Craft className="space-y-3">
          <h1>{props.title}</h1>
          <h3 className="text-muted-foreground">{props.subtitle}</h3>
        </Craft>
        <div className="relative h-[480px] w-full overflow-hidden rounded-lg border">
          <img
            // @ts-ignore
            src={props.image.url}
            // @ts-ignore
            width={props.image.width}
            // @ts-ignore
            height={props.image.height}
            // @ts-ignore
            alt={props.image.alt}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>
      </Container>
    </Section>
  )
}
