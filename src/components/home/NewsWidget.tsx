import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  published?: string
  image?: {
    url: string
    alt?: string
  }
}

interface NewsWidgetProps {
  news: NewsItem[]
}

const NewsWidget: React.FC<NewsWidgetProps> = ({ news }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Новости
          <Link
            href="/news"
            className="text-sm font-normal text-muted-foreground hover:text-primary transition-colors"
          >
            Все новости →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground">Новостей пока нет</p>
        ) : (
          news.slice(0, 5).map((item) => (
            <div key={item.id} className="border-b border-border last:border-b-0 pb-3 last:pb-0">
              <Link href={`/news/${item.id}`} className="block group">
                <h3 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-1">
                  {item.title}
                </h3>
                {item.published && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formatDate(item.published)}</span>
                  </div>
                )}
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default NewsWidget
