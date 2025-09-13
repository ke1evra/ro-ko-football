import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarIcon, UserIcon } from 'lucide-react'
import Image from 'next/image'

interface ArticleItem {
  id: string
  title: string
  author?: string
  published?: string
  image?: {
    url: string
    alt?: string
  }
}

interface ArticlesWidgetProps {
  articles: ArticleItem[]
}

const ArticlesWidget: React.FC<ArticlesWidgetProps> = ({ articles }) => {
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Статьи</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {articles.length === 0 ? (
          <p className="text-muted-foreground">Статей пока нет</p>
        ) : (
          <>
            {articles.slice(0, 3).map((article) => (
              <article key={article.id} className="group">
                <Link href={`/articles/${article.id}`} className="block">
                  <div className="flex gap-4">
                    {article.image?.url && (
                      <div className="relative w-24 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <Image
                          src={article.image.url}
                          alt={article.image.alt || article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {article.author && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            <span>{article.author}</span>
                          </div>
                        )}
                        {article.published && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{formatDate(article.published)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}

            <div className="pt-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/articles">Посмотреть все статьи</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ArticlesWidget
