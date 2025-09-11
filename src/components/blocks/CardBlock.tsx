import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import RichTextRenderer from '../RichTextRenderer'

interface CardBlockProps {
  title?: string
  description?: string
  content?: any
}

export default function CardBlock({ title, description, content }: CardBlockProps) {
  return (
    <Card className="my-4 bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {content && (
        <CardContent>
          <RichTextRenderer value={content} />
        </CardContent>
      )}
    </Card>
  )
}