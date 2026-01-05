'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { PredictionResultCard } from './PredictionResultCard'

interface PredictionResultLoaderProps {
  postId: string
}

export function PredictionResultLoader({ postId }: PredictionResultLoaderProps) {
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<'pending' | 'settled'>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/predictions/result/${postId}`)
        if (response.ok) {
          const data = await response.json()
          setResult(data.result)
          setStatus(data.status)
        }
      } catch (error) {
        console.error('Error fetching prediction result:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [postId])

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Загрузка результата...</div>
        </CardContent>
      </Card>
    )
  }

  return <PredictionResultCard result={result} status={status} />
}
