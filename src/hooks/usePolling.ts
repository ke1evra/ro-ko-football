/**
 * Хук для поллинга данных с автоматическим обновлением
 */

import { useEffect, useRef, useState } from 'react'

interface UsePollingOptions {
  interval?: number // Интервал в миллисекундах
  enabled?: boolean // Включен ли поллинг
  immediate?: boolean // Выполнить сразу при монтировании
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions = {}
) {
  const {
    interval = 60000, // 1 минута по умолчанию
    enabled = true,
    immediate = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchData = async () => {
    if (!mountedRef.current) return
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchFn()
      
      if (mountedRef.current) {
        setData(result)
        setLastUpdated(new Date())
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(fetchData, interval)
  }

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const refresh = () => {
    fetchData()
  }

  useEffect(() => {
    mountedRef.current = true
    
    if (immediate) {
      fetchData()
    }
    
    if (enabled) {
      startPolling()
    }

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [enabled, interval])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    startPolling,
    stopPolling
  }
}