'use client'

import { useState } from 'react'
import { Container, Section } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Play, AlertCircle, CheckCircle } from 'lucide-react'
import { executeApiMethod, type ApiTestResult } from './api-actions'

interface ApiMethod {
  name: string
  description: string
  category: string
  params?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select'
    required?: boolean
    description?: string
    options?: string[]
    min?: number
    max?: number
  }>
}

const API_METHODS: ApiMethod[] = [
  // Catalogs Service
  {
    name: 'getCompetitionsListJson',
    description: 'Получить список соревнований',
    category: 'Catalogs',
    params: {
      page: { type: 'number', description: 'Номер страницы (по умолчанию 1)', min: 1 },
      size: { type: 'number', description: 'Размер страницы (по умолчанию 30, максимум 100)', min: 1, max: 100 },
      lang: { type: 'string', description: 'ISO 639-1 код языка для перевода (например, ru)' },
      country_id: { type: 'number', description: 'ID страны' },
      federation_id: { type: 'number', description: 'ID федерации' },
    },
  },
  {
    name: 'getCountriesListJson',
    description: 'Получить список стран',
    category: 'Catalogs',
    params: {
      page: { type: 'number', description: 'Номер страницы', min: 1 },
      size: { type: 'number', description: 'Размер страницы', min: 1, max: 100 },
      lang: { type: 'string', description: 'Код языка' },
    },
  },
  {
    name: 'getFederationsListJson',
    description: 'Получить список федераций',
    category: 'Catalogs',
  },
  {
    name: 'getSeasonsListJson',
    description: 'Получить список сезонов',
    category: 'Catalogs',
  },
  {
    name: 'getTeamsLastmatchesJson',
    description: 'Получить последние матчи команды',
    category: 'Catalogs',
    params: {
      team_id: { type: 'number', required: true, description: 'ID команды' },
      limit: { type: 'number', description: 'Лимит матчей', min: 1, max: 50 },
    },
  },
  {
    name: 'getTeamsListJson',
    description: 'Получить список команд',
    category: 'Catalogs',
    params: {
      page: { type: 'number', description: 'Номер страницы', min: 1 },
      size: { type: 'number', description: 'Размер страницы', min: 1, max: 100 },
      lang: { type: 'string', description: 'Код языка' },
      country_id: { type: 'number', description: 'ID страны' },
      competition_id: { type: 'number', description: 'ID соревнования' },
    },
  },
  
  // Events Service
  {
    name: 'getMatchesEventsJson',
    description: 'Получить события матча',
    category: 'Events',
    params: {
      match_id: { type: 'number', required: true, description: 'ID матча' },
    },
  },
  
  // Fixtures Service
  {
    name: 'getFixturesMatchesJson',
    description: 'Получить расписание матчей',
    category: 'Fixtures',
    params: {
      date: { type: 'string', description: 'Дата в формате YYYY-MM-DD' },
      competition_id: { type: 'number', description: 'ID соревнования' },
      team_id: { type: 'number', description: 'ID команды' },
      page: { type: 'number', description: 'Номер страницы', min: 1 },
      size: { type: 'number', description: 'Размер страницы', min: 1, max: 100 },
    },
  },
  
  // Lineups & Stats Service
  {
    name: 'getMatchesLineupsJson',
    description: 'Получить составы команд в матче',
    category: 'Lineups & Stats',
    params: {
      match_id: { type: 'number', required: true, description: 'ID матча' },
    },
  },
  {
    name: 'getMatchesStatsJson',
    description: 'Получить статистику матча',
    category: 'Lineups & Stats',
    params: {
      match_id: { type: 'number', required: true, description: 'ID матча' },
    },
  },
  {
    name: 'getTeamsHead2HeadJson',
    description: 'Получить статистику личных встреч команд',
    category: 'Lineups & Stats',
    params: {
      team1_id: { type: 'number', required: true, description: 'ID первой команды' },
      team2_id: { type: 'number', required: true, description: 'ID второй команды' },
      limit: { type: 'number', description: 'Лимит матчей', min: 1, max: 50 },
    },
  },
  
  // Matches Service
  {
    name: 'getMatchesHistoryJson',
    description: 'Получить историю матчей',
    category: 'Matches',
    params: {
      date_from: { type: 'string', description: 'Дата начала (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'Дата окончания (YYYY-MM-DD)' },
      competition_id: { type: 'number', description: 'ID соревнования' },
      team_id: { type: 'number', description: 'ID команды' },
      page: { type: 'number', description: 'Номер страницы', min: 1 },
      size: { type: 'number', description: 'Размер страницы', min: 1, max: 100 },
    },
  },
  {
    name: 'getMatchesLiveJson',
    description: 'Получить live матчи',
    category: 'Matches',
    params: {
      competition_id: { type: 'number', description: 'ID соревнования' },
    },
  },
  
  // Tables Service
  {
    name: 'getCompetitionsTopscorersJson',
    description: 'Получить лучших бомбардиров соревнования',
    category: 'Tables',
    params: {
      competition_id: { type: 'number', required: true, description: 'ID соревнования' },
      season_id: { type: 'number', description: 'ID сезона' },
      limit: { type: 'number', description: 'Лимит игроков', min: 1, max: 100 },
    },
  },
  {
    name: 'getCompetitionsTopcardsJson',
    description: 'Получить игроков с наибольшим числом карточек',
    category: 'Tables',
    params: {
      competition_id: { type: 'number', required: true, description: 'ID соревнования' },
      season_id: { type: 'number', description: 'ID сезона' },
      limit: { type: 'number', description: 'Лимит игроков', min: 1, max: 100 },
    },
  },
  {
    name: 'getTablesStandingsJson',
    description: 'Получить турнирную таблицу',
    category: 'Tables',
    params: {
      competition_id: { type: 'number', required: true, description: 'ID соревнования' },
      season_id: { type: 'number', description: 'ID сезона' },
      include_form: { type: 'select', description: 'Включить форму команд', options: ['yes', 'no'] },
    },
  },
  
  // Utility Service
  {
    name: 'getAuthVerifyJson',
    description: 'Проверить авторизацию',
    category: 'Utility',
  },
  {
    name: 'getCountriesFlagJson',
    description: 'Получить флаг страны',
    category: 'Utility',
    params: {
      country_id: { type: 'number', required: true, description: 'ID страны' },
      size: { type: 'select', description: 'Размер флага', options: ['small', 'medium', 'large'] },
    },
  },
]

export default function ApiTestPage() {
  const [selectedMethod, setSelectedMethod] = useState<ApiMethod | null>(null)
  const [params, setParams] = useState<Record<string, any>>({})
  const [result, setResult] = useState<ApiTestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const categories = Array.from(new Set(API_METHODS.map(method => method.category)))

  const handleParamChange = (paramName: string, value: any) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value,
    }))
  }

  const executeMethod = async () => {
    if (!selectedMethod) return

    setLoading(true)
    setResult(null)

    try {
      // Подготавливаем параметры
      const cleanParams: Record<string, any> = {}
      Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          // Конвертируем типы
          if (selectedMethod.params?.[key]?.type === 'number') {
            cleanParams[key] = Number(value)
          } else {
            cleanParams[key] = value
          }
        }
      })

      // Используем серверный action
      const apiResult = await executeApiMethod({
        method: selectedMethod.name,
        params: cleanParams,
      })

      setResult(apiResult)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        duration: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const renderParamInput = (paramName: string, paramConfig: NonNullable<ApiMethod['params']>[string]) => {
    const value = params[paramName] || ''

    switch (paramConfig.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleParamChange(paramName, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите значение" />
            </SelectTrigger>
            <SelectContent>
              {paramConfig.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleParamChange(paramName, e.target.value)}
            min={paramConfig.min}
            max={paramConfig.max}
            placeholder={`Введите число${paramConfig.min ? ` (мин: ${paramConfig.min})` : ''}${paramConfig.max ? ` (макс: ${paramConfig.max})` : ''}`}
          />
        )
      
      case 'boolean':
        return (
          <Select value={value} onValueChange={(val) => handleParamChange(paramName, val === 'true')}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите значение" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleParamChange(paramName, e.target.value)}
            placeholder="Введите значение"
          />
        )
    }
  }

  return (
    <Section>
      <Container className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Тестирование Live Score API</h1>
          <p className="text-muted-foreground">
            Интерактивное тестирование всех доступных методов Live Score API с параметризацией
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список методов */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Методы API</CardTitle>
                <CardDescription>Выберите метод для тестирования</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={categories[0]} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-1 lg:h-auto">
                    {categories.map(category => (
                      <TabsTrigger key={category} value={category} className="text-xs">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {categories.map(category => (
                    <TabsContent key={category} value={category} className="space-y-2">
                      {API_METHODS.filter(method => method.category === category).map(method => (
                        <Button
                          key={method.name}
                          variant={selectedMethod?.name === method.name ? 'default' : 'outline'}
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => {
                            setSelectedMethod(method)
                            setParams({})
                            setResult(null)
                          }}
                        >
                          <div>
                            <div className="font-medium text-sm">{method.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {method.description}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Параметры и выполнение */}
          <div className="lg:col-span-2 space-y-6">
            {selectedMethod ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedMethod.name}
                      <Badge variant="secondary">{selectedMethod.category}</Badge>
                    </CardTitle>
                    <CardDescription>{selectedMethod.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedMethod.params && Object.keys(selectedMethod.params).length > 0 ? (
                      <>
                        <h4 className="font-medium">Параметры</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(selectedMethod.params).map(([paramName, paramConfig]) => (
                            <div key={paramName} className="space-y-2">
                              <Label htmlFor={paramName} className="flex items-center gap-2">
                                {paramName}
                                {paramConfig.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    обязательный
                                  </Badge>
                                )}
                              </Label>
                              {renderParamInput(paramName, paramConfig)}
                              {paramConfig.description && (
                                <p className="text-xs text-muted-foreground">
                                  {paramConfig.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Этот метод не требует параметров
                      </p>
                    )}

                    <Button
                      onClick={executeMethod}
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Выполняется...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Выполнить запрос
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Результат */}
                {result && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {result.success ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Успешно
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Ошибка
                          </>
                        )}
                        {result.duration && (
                          <Badge variant="outline">
                            {result.duration}мс
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.success ? (
                        <div className="space-y-4">
                          <div>
                            <Label>Ответ API:</Label>
                            <Textarea
                              value={JSON.stringify(result.data, null, 2)}
                              readOnly
                              className="mt-2 font-mono text-sm h-96"
                            />
                          </div>
                        </div>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {result.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      Выберите метод API из списка слева для начала тестирования
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}