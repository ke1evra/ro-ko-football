'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, 
  Globe, 
  Search, 
  Filter,
  MapPin,
  Calendar,
  Users,
  BarChart3,
  ExternalLink,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface Country {
  id: string
  name: string
  code?: string
  ext?: {
    lsa: string
  }
  flag?: {
    url: string
  }
  competitionsCount?: number
}

interface Competition {
  id: string
  name: string
  shortName?: string
  type: 'league' | 'cup' | 'international' | 'friendly'
  ext?: {
    lsa: string
  }
  country?: Country
  season?: string
  isActive: boolean
  lastSyncedAt?: string
  syncStatus: 'synced' | 'pending' | 'error'
  logo?: {
    url: string
  }
  teamsCount?: number
  standingsCount?: number
}

export default function LeaguesDashboard() {
  const [countries, setCountries] = useState<Country[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('countries')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Загружаем страны с количеством соревнований
      const countriesResponse = await fetch('/api/countries-with-competitions')
      if (countriesResponse.ok) {
        const countriesData = await countriesResponse.json()
        setCountries(countriesData)
      }

      // Загружаем соревнования с дополнительной инфор��ацией
      const competitionsResponse = await fetch('/api/competitions-with-stats')
      if (competitionsResponse.ok) {
        const competitionsData = await competitionsResponse.json()
        setCompetitions(competitionsData)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         competition.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCountry = selectedCountry === 'all' || competition.country?.id === selectedCountry
    const matchesType = selectedType === 'all' || competition.type === selectedType
    
    return matchesSearch && matchesCountry && matchesType
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'league': return 'Лига'
      case 'cup': return 'Кубок'
      case 'international': return 'Международный'
      case 'friendly': return 'Товарищеские'
      default: return type
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'league': return '🏅'
      case 'cup': return '🏆'
      case 'international': return '🌍'
      case 'friendly': return '🤝'
      default: return '⚽'
    }
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600 border-green-600'
      case 'pending': return 'text-yellow-600 border-yellow-600'
      case 'error': return 'text-red-600 border-red-600'
      default: return ''
    }
  }

  const getSyncStatusLabel = (status: string) => {
    switch (status) {
      case 'synced': return 'Синхронизировано'
      case 'pending': return 'Ожидает'
      case 'error': return 'Ошибка'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Загрузка данных...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Дашборд лиг и стран</h1>
            <p className="text-muted-foreground">Управление соревнованиями и странами</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          Обновить данные
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Страны ({countries.length})
          </TabsTrigger>
          <TabsTrigger value="competitions" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Соревнования ({competitions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Страны
              </CardTitle>
              <CardDescription>
                Список стран с количеством соревнований
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {countries.map((country) => (
                  <Card key={country.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {country.flag?.url ? (
                            <img 
                              src={country.flag.url} 
                              alt={`Флаг ${country.name}`}
                              className="w-6 h-4 object-cover rounded"
                            />
                          ) : (
                            <div className="w-6 h-4 bg-gray-200 rounded flex items-center justify-center text-xs">
                              {country.code || '🏳️'}
                            </div>
                          )}
                          <span className="font-medium">{country.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {country.competitionsCount || 0}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {country.competitionsCount || 0} соревнований
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitions" className="space-y-4">
          {/* Фильтры */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по названию соревнования..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Выберите страну" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все страны</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="league">Лиги</SelectItem>
                    <SelectItem value="cup">Кубки</SelectItem>
                    <SelectItem value="international">Международные</SelectItem>
                    <SelectItem value="friendly">Товарищеские</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Список соревнований */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompetitions.map((competition) => (
              <Card key={competition.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTypeIcon(competition.type)}</span>
                      <Badge variant={competition.type === 'cup' ? 'default' : 'secondary'}>
                        {getTypeLabel(competition.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {competition.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Активно
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={getSyncStatusColor(competition.syncStatus)}
                      >
                        {getSyncStatusLabel(competition.syncStatus)}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {competition.name}
                    {competition.shortName && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({competition.shortName})
                      </span>
                    )}
                  </CardTitle>
                  {competition.country && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {competition.country.name}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {competition.season && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Сезон: {competition.season}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{competition.teamsCount || 0} команд</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span>{competition.standingsCount || 0} таблиц</span>
                      </div>
                    </div>
                  </div>
                  
                  {competition.lastSyncedAt && (
                    <div className="text-xs text-muted-foreground">
                      Обновлено: {new Date(competition.lastSyncedAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      ID: {competition.ext?.lsa}
                    </div>
                    <Link href={`/competitions/${competition.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Открыть
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCompetitions.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Соревнования не найдены</h3>
                <p className="text-muted-foreground">
                  Попробуйте изменить параметры поиска или фильтры
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}