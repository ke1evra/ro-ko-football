import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'

interface PostsViewToggleProps {
  currentView: string
  currentPage: number
}

export function PostsViewToggle({ currentView, currentPage }: PostsViewToggleProps) {
  const pageParam = currentPage > 1 ? `?page=${currentPage}` : ''
  const gridHref = `/posts${pageParam}${pageParam ? '&view=grid' : '?view=grid'}`
  const listHref = `/posts${pageParam}`

  return (
    <div className="flex items-center gap-2 border rounded-md p-1">
      <Link
        href={listHref}
        className={`inline-flex items-center justify-center p-2 rounded transition-colors ${
          currentView === 'list'
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Список"
      >
        <List size={18} />
      </Link>
      <Link
        href={gridHref}
        className={`inline-flex items-center justify-center p-2 rounded transition-colors ${
          currentView === 'grid'
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Сетка"
      >
        <LayoutGrid size={18} />
      </Link>
    </div>
  )
}
