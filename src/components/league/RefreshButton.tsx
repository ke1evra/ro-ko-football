/**
 * Кнопка для ручного обновления данных лиги
 * Использует Server Actions для revalidation
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { revalidateResource, revalidateLeague, revalidateAllLive } from '@/lib/actions/revalidate'

interface RefreshButtonProps {
  league: string
  season: string
}

export default function RefreshButton({ league, season }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async (type: 'all' | 'standings' | 'live' | 'fixtures') => {
    setIsLoading(true)
    
    try {
      let result
      
      switch (type) {
        case 'all':
          result = await revalidateLeague(league, season)
          break
        case 'standings':
          result = await revalidateResource({ type: 'standings', league, season })
          break
        case 'live':
          result = await revalidateResource({ type: 'live', league })
          break
        case 'fixtures':
          result = await revalidateResource({ type: 'fixtures', league, season })
          break
        default:
          throw new Error('Unknown refresh type')
      }

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Ошибка при обновлении данных')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshAllLive = async () => {
    setIsLoading(true)
    
    try {
      const result = await revalidateAllLive()
      
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Refresh all live error:', error)
      toast.error('Ошибка при обновлении live-данных')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleRefresh('all')}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Все данные
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleRefresh('standings')}
          disabled={isLoading}
        >
          Турнирная таблица
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleRefresh('live')}
          disabled={isLoading}
        >
          Live-матчи
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleRefresh('fixtures')}
          disabled={isLoading}
        >
          Ближайшие матчи
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRefreshAllLive}
          disabled={isLoading}
        >
          Все live-данные
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}