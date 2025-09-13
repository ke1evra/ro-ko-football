'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as Client from '@/app/(frontend)/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// UI to explore and invoke generated client functions from the browser
// - Lists exported request functions (get*Json)
// - Inputs for known query params
// - Executes and shows JSON result or error

// Map of operation -> known query param names
const operationParams: Record<string, string[]> = {
  getMatchesLiveJson: ['lang', 'page', 'competition_id', 'country_id', 'team_id', 'fixture_id'],
  getMatchesHistoryJson: [
    'lang',
    'page',
    'competition_id',
    'country_id',
    'team_id',
    'date',
    'from',
    'to',
  ],
  getFixturesMatchesJson: [
    'lang',
    'page',
    'size',
    'competition_id',
    'country_id',
    'team_id',
    'date',
    'from',
    'to',
  ],
  getScoresEventsJson: ['id', 'lang'],
  getMatchesLineupsJson: ['match_id', 'lang'],
  getMatchesStatsJson: ['match_id'],
  getTablesStandingsJson: ['competition_id', 'lang'],
  getTeamsListJson: ['page', 'size', 'lang', 'country_id', 'federation_id'],
  getCompetitionsListJson: ['page', 'size', 'lang', 'country_id'],
  getCountriesListJson: ['page', 'size'],
  getAuthVerifyJson: [],
}

function isCallableExport(k: string, v: unknown): v is (...args: any[]) => Promise<any> {
  return (
    typeof v === 'function' && k.startsWith('get') && !k.endsWith('Url') && !k.endsWith('Service')
  )
}

const allMethods = Object.entries(Client)
  .filter(([k, v]) => isCallableExport(k, v))
  .map(([k]) => k)
  .sort()

function readLS(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}

function writeLS(key: string, value: string) {
  if (typeof window === 'undefined') return
  if (value) window.localStorage.setItem(key, value)
  else window.localStorage.removeItem(key)
}

export default function ApiTester() {
  const [selected, setSelected] = useState<string>('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [requestPreview, setRequestPreview] = useState<string>('')

  const [apiBase, setApiBase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setApiBase(readLS('LIVESCORE_API_BASE'))
    setApiKey(readLS('LIVESCORE_KEY'))
    setApiSecret(readLS('LIVESCORE_SECRET'))
  }, [])

  const paramsList = useMemo(() => {
    if (!selected) return []
    return operationParams[selected] || []
  }, [selected])

  const handleChangeParam = (name: string, value: string) => {
    setParams((p) => ({ ...p, [name]: value }))
  }

  const call = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const fn = (Client as any)[selected] as Function
      const maybeParams = paramsList.length > 0 ? params : undefined

      // Build request preview using get<Method>NameUrl helper if present
      try {
        const urlHelperName = `get${selected}Url`
        const urlHelper = (Client as any)[urlHelperName]
        const base =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('LIVESCORE_API_BASE') ||
              process.env.NEXT_PUBLIC_LIVESCORE_API_BASE ||
              'https://livescore-api.com/api-client'
            : ''
        if (typeof urlHelper === 'function') {
          const info = urlHelper() as { url: string }
          const usp = new URLSearchParams()
          Object.entries(maybeParams || {}).forEach(([k, v]) => {
            if (v != null && v !== '') usp.set(k, String(v))
          })
          // auth params are added by runtime, but include them in preview if present
          const key =
            typeof window !== 'undefined' ? window.localStorage.getItem('LIVESCORE_KEY') || '' : ''
          const secret =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('LIVESCORE_SECRET') || ''
              : ''
          if (key) usp.set('key', key)
          if (secret) usp.set('secret', secret)
          if (!usp.has('lang')) usp.set('lang', 'ru')
          const full = `${(base || '').replace(/\/?$/, '/')}${info.url.replace(/^\//, '')}${usp.toString() ? `?${usp.toString()}` : ''}`
          setRequestPreview(full)
        } else {
          setRequestPreview('')
        }
      } catch {
        setRequestPreview('')
      }

      console.log('[ApiTester] call', { selected, params: maybeParams })
      const res = await fn(maybeParams)
      console.log('[ApiTester] result', res)
      setResult(res)
    } catch (e: any) {
      console.error('[ApiTester] error', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  const saveCreds = () => {
    writeLS('LIVESCORE_API_BASE', apiBase)
    writeLS('LIVESCORE_KEY', apiKey)
    writeLS('LIVESCORE_SECRET', apiSecret)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const clearCreds = () => {
    setApiBase('')
    setApiKey('')
    setApiSecret('')
    writeLS('LIVESCORE_API_BASE', '')
    writeLS('LIVESCORE_KEY', '')
    writeLS('LIVESCORE_SECRET', '')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Tester</CardTitle>
        <CardDescription>Тестирование методов API LiveScore</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Секция настроек API */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Доступ к API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="api-base" className="text-xs">
                  API Base URL
                </Label>
                <Input
                  id="api-base"
                  placeholder="LIVESCORE_API_BASE (optional)"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-xs">
                  API Key
                </Label>
                <Input
                  id="api-key"
                  placeholder="LIVESCORE_KEY"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-secret" className="text-xs">
                  API Secret
                </Label>
                <Input
                  id="api-secret"
                  placeholder="LIVESCORE_SECRET"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveCreds}>
                Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={clearCreds}>
                Очистить
              </Button>
              {saved && (
                <Badge variant="secondary" className="text-green-600">
                  Сохранено
                </Badge>
              )}
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Также можно использовать переменные окружения: NEXT_PUBLIC_LIVESCORE_API_BASE,
                NEXT_PUBLIC_LIVESCORE_KEY, NEXT_PUBLIC_LIVESCORE_SECRET
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Separator />

        {/* Секция выбора метода */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-method">Метод API</Label>
            <Select
              value={selected}
              onValueChange={(value) => {
                setSelected(value)
                setParams({})
                setResult(null)
                setError(null)
              }}
            >
              <SelectTrigger id="api-method">
                <SelectValue placeholder="Выберите метод" />
              </SelectTrigger>
              <SelectContent>
                {allMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Параметры метода */}
          {selected && (
            <div className="space-y-3">
              {paramsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет параметров</p>
              ) : (
                <div className="space-y-3">
                  {paramsList.map((p) => (
                    <div key={p} className="space-y-2">
                      <Label htmlFor={`param-${p}`} className="text-sm">
                        {p}
                      </Label>
                      <Input
                        id={`param-${p}`}
                        placeholder={`Введите ${p}`}
                        value={params[p] || ''}
                        onChange={(e) => handleChangeParam(p, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={call} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Выполняю…' : 'Выполнить запрос'}
              </Button>
            </div>
          )}
        </div>

        {/* Предпросмотр запроса */}
        {requestPreview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Запрос (preview)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 w-full rounded-md border">
                <pre className="p-3 text-xs">{requestPreview}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Результат запроса */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-600">Результат</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full rounded-md border">
                <pre className="p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Ошибка запроса */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <div className="text-sm">
                <span className="font-semibold">Сообщение:</span> {error?.message || String(error)}
              </div>
              {typeof error?.status !== 'undefined' && (
                <div className="text-sm">
                  <span className="font-semibold">Статус:</span> {String(error.status)}
                </div>
              )}
              {error?.data && (
                <div className="mt-2">
                  <div className="text-sm font-semibold">Данные:</div>
                  <ScrollArea className="mt-1 h-64 w-full rounded-md border bg-background">
                    <pre className="p-2 text-xs">{JSON.stringify(error.data, null, 2)}</pre>
                  </ScrollArea>
                </div>
              )}
              <div className="mt-2">
                <div className="text-sm font-semibold">Полная ошибка:</div>
                <ScrollArea className="mt-1 h-64 w-full rounded-md border bg-background">
                  <pre className="p-2 text-xs">{JSON.stringify(error, null, 2)}</pre>
                </ScrollArea>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
