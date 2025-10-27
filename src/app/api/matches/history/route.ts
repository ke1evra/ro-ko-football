import { NextRequest, NextResponse } from 'next/server'
import customFetch from '@/lib/http/livescore/customFetch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || undefined
    const teamId = searchParams.get('team_id') || undefined
    const matchId = searchParams.get('match_id') || undefined
    const competitionId = searchParams.get('competition_id') || undefined
    const sizeParam = searchParams.get('size') || '50'

    const size = Math.max(1, Math.min(100, Number(sizeParam) || 50))

    console.log(`[History API] Параметры запроса:`, {
      date,
      teamId,
      matchId,
      competitionId,
      size,
    })

    // Собираем параметры запроса
    const params: Record<string, any> = {
      lang: 'ru',
      size,
    }
    if (date) params.date = date
    if (teamId) params.team_id = teamId
    if (matchId) params.match_id = matchId
    if (competitionId) params.competition_id = competitionId

    // Вызываем LiveScore API через kubb-совместимый клиент с таймаутом/ретраями
    const { data } = await customFetch<any>({
      url: '/matches/history.json',
      params,
      timeoutMs: 10000,
      // cache/no-store и next.revalidate выставляются обёрткой по умолчанию
    })

    console.log(`[History API] Ответ получен:`, {
      success: data?.success,
      hasData: !!data?.data,
      matchesCount: data?.data?.match?.length || data?.data?.matches?.length || 0,
    })

    if (!data?.success) {
      console.error(`[History API] API вернул ошибку:`, data)
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'API вернул ошибку',
        },
        { status: 400 },
      )
    }

    // Нормализуем ответ для совместимости
    const matches = (data?.data?.match || data?.data?.matches || []) as any[]

    console.log(`[History API] Возвращаем ${matches.length} матчей`)

    return NextResponse.json({
      success: true,
      data: {
        matches,
        total: matches.length,
        page: 1,
        size,
      },
    })
  } catch (error: any) {
    console.error('[History API] Ошибка:', error)

    // Ошибки от customFetch содержат status/statusText
    if (error && typeof error === 'object' && 'status' in error) {
      const status = Number(error.status) || 500
      const message = error?.data?.message || error?.statusText || 'Ошибка сервера'
      return NextResponse.json({ success: false, message }, { status })
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, message: 'Превышено время ожидания запроса' },
        { status: 408 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка сервера',
      },
      { status: 500 },
    )
  }
}
