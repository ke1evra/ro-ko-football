import { Section, Container, Craft } from '@/components/craft'
import { Button } from '@/components/ui/button'

import type { Block } from 'payload'
import type { HeroBlock as HeroBlockProps, Media } from '@/payload-types'

import Link from 'next/link'
import Image from 'next/image'

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
  const image = props.image as Media

  return (
    <Section>
      <Container className="space-y-6 md:space-y-12">
        <Craft className="space-y-3">
          <h1>{props.title}</h1>
          <h3 className="text-muted-foreground">{props.subtitle}</h3>
        </Craft>

        <div className="space-x-2">
          <Button asChild size="sm">
            <Link href={props.button.link}>{props.button.text}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrijr%2Fpayload-saas-starter&env=DATABASE_URI,PAYLOAD_SECRET,R2_ACCESS_KEY_ID,R2_BUCKET,R2_ENDPOINT&project-name=payload-saas-starter&repository-name=payload-saas-starter&demo-title=Payload%20SaaS%20Starter&demo-description=Open%20Source%20SaaS%20starter%20for%20creating%20applications%20with%20Next.js%20and%20Payload&demo-url=https%3A%2F%2Fpayload-saas-starter.vercel.app">
              Deploy on Vercel
            </a>
          </Button>
        </div>

        <Image
          src={image.url || ''}
          width={image.width || 0}
          height={image.height || 0}
          alt={image.alt || ''}
          loading="eager"
          className="rounded-lg border"
        />
      </Container>
    </Section>
  )
}
