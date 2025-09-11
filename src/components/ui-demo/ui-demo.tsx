'use client'

import * as React from 'react'
import { useState } from 'react'
import { Section, Container, Prose } from '@/components/ds'

// UI components
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger as MenubarTriggerBtn,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
} from '@/components/ui/menubar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb'
import { Calendar } from '@/components/ui/calendar'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator as CommandSep,
} from '@/components/ui/command'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuGroup,
} from '@/components/ui/context-menu'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts'

import { toast } from 'sonner'
import {
  Trophy,
  Users2,
  MapPin,
  CalendarDays,
  Ticket,
  Search,
  Bell,
  Star,
  Shield,
  Goal,
  Flag,
} from 'lucide-react'
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

const teams = [
  { id: 1, name: 'Спартак', city: 'Москва', short: 'СПА' },
  { id: 2, name: 'Зенит', city: 'Санкт-Петербург', short: 'ЗЕН' },
  { id: 3, name: 'ЦСКА', city: 'Москва', short: 'ЦСК' },
  { id: 4, name: 'Локомотив', city: 'Москва', short: 'ЛОК' },
]

const upcomingMatches = [
  {
    id: 1,
    homeTeam: 'Спартак',
    awayTeam: 'Зенит',
    date: new Date('2024-12-15T19:00:00'),
    venue: 'Открытие Банк Арена',
    status: 'upcoming',
  },
  {
    id: 2,
    homeTeam: 'ЦСКА',
    awayTeam: 'Локомотив',
    date: new Date('2024-12-16T16:30:00'),
    venue: 'ВЭБ Арена',
    status: 'upcoming',
  },
  {
    id: 3,
    homeTeam: 'Зенит',
    awayTeam: 'ЦСКА',
    date: new Date('2024-12-20T20:00:00'),
    venue: 'Газпром Арена',
    status: 'upcoming',
  },
]

// Функция для форматирования даты матча
const formatMatchDate = (date: Date) => {
  if (isToday(date)) {
    return `Сегодня, ${format(date, 'HH:mm', { locale: ru })}`
  }
  if (isTomorrow(date)) {
    return `Завтра, ${format(date, 'HH:mm', { locale: ru })}`
  }
  return format(date, 'dd MMMM, HH:mm', { locale: ru })
}

const standings = [
  { pos: 1, team: 'Зенит', p: 24, w: 7, d: 3, l: 2, gf: 24, ga: 11, pts: 24 },
  { pos: 2, team: 'Спартак', p: 24, w: 7, d: 2, l: 3, gf: 21, ga: 12, pts: 23 },
  { pos: 3, team: 'ЦСКА', p: 24, w: 6, d: 4, l: 2, gf: 19, ga: 10, pts: 22 },
  { pos: 4, team: 'Локомотив', p: 24, w: 6, d: 3, l: 3, gf: 18, ga: 13, pts: 21 },
]

const goalsByMinute = [
  { minute: '0-15', goals: 5 },
  { minute: '16-30', goals: 8 },
  { minute: '31-45', goals: 7 },
  { minute: '46-60', goals: 10 },
  { minute: '61-75', goals: 6 },
  { minute: '76-90', goals: 9 },
]

const chartConfig: ChartConfig = {
  goals: {
    label: 'Голы',
    color: 'hsl(var(--primary))',
  },
}

export function UIDemo() {
  const [season, setSeason] = useState<string>('2024/25')
  const [openCmd, setOpenCmd] = useState(false)
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date())

  return (
    <TooltipProvider>
      <Section className="bg-muted/20 border-b">
        <Container className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Футбольный UI — демо</h1>
              <p className="text-muted-foreground text-sm">
                Компоненты shadcn/ui в тематике футбола
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Клубы</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-2 p-2 w-[320px]">
                      {teams.map((t) => (
                        <NavigationMenuLink
                          key={t.id}
                          className="hover:bg-accent rounded-md p-2"
                          href="#"
                        >
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.city}</div>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Матчи</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-2 w-[300px]">
                      <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent" href="#">
                        Ближайшие
                      </NavigationMenuLink>
                      <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent" href="#">
                        Результаты
                      </NavigationMenuLink>
                      <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent" href="#">
                        Расписание
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Menubar>
              <MenubarMenu>
                <MenubarTriggerBtn>Действия</MenubarTriggerBtn>
                <MenubarContent>
                  <MenubarLabel>Быстрые</MenubarLabel>
                  <MenubarItem
                    onClick={() => toast.success('Гол! Спартак забивает на 54-й минуте')}
                  >
                    Показать тост
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onClick={() => setOpenCmd(true)}>
                    <Search className="size-4" /> Открыть поиск
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users2 className="size-4" /> Профиль
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Аккаунт</DropdownMenuLabel>
                <DropdownMenuItem>Настройки</DropdownMenuItem>
                <DropdownMenuCheckboxItem checked>Уведомления</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Выйти</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  {/* <FilterDot /> */} Фильтры
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Фильтры матчей</SheetTitle>
                  <SheetDescription>Уточните критерии отбора</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label>Сезон</Label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Выберите сезон" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Сезоны</SelectLabel>
                          {['2022/23', '2023/24', '2024/25'].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Турнир</Label>
                    <RadioGroup defaultValue="league">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="league" id="rg1" />
                        <Label htmlFor="rg1">Премьер-лига</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="cup" id="rg2" />
                        <Label htmlFor="rg2">Кубок</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Bell className="size-4" /> Уведомления о матчах
                    </Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-1">
                    <Label>Диапазон цены билетов</Label>
                    <Slider
                      defaultValue={[20, 80]}
                      min={0}
                      max={100}
                      step={5}
                      className="w-[240px]"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Главная</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">UI Демо</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Футбол</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Alert>
            <AlertTitle>Внимание</AlertTitle>
            <AlertDescription>
              Демонстрация компонентов на тестовых данных. Нажмите &#34;Показать тост&#34; в меню,
              чтобы увидеть уведомление.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="matches" className="mt-2">
            <TabsList>
              <TabsTrigger value="matches">
                <CalendarDays className="size-4" /> Матчи
              </TabsTrigger>
              <TabsTrigger value="table">
                <Trophy className="size-4" /> Таблица
              </TabsTrigger>
              <TabsTrigger value="players">
                <Users2 className="size-4" /> Игроки
              </TabsTrigger>
              <TabsTrigger value="ui">
                <Star className="size-4" /> Разное
              </TabsTrigger>
            </TabsList>

            {/* Matches */}
            <TabsContent value="matches" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Ближайший матч</CardTitle>
                  <CardDescription>Выберите дату и получите информацию</CardDescription>
                  <CardAction>
                    <Badge>LIVE</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <div className="bg-red-600 text-white size-10 rounded-full grid place-items-center">
                          С
                        </div>
                      </Avatar>
                      <span className="font-medium">Спартак</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <div className="bg-blue-600 text-white size-10 rounded-full grid place-items-center">
                          З
                        </div>
                      </Avatar>
                      <span className="font-medium">Зенит</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4" /> Открытие Банк Арена
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Ticket className="size-4" /> Купить билеты
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Покупка билетов</DialogTitle>
                            <DialogDescription>
                              Укажите количество и контактные данные
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Label>Количество</Label>
                            <Slider defaultValue={[2]} min={1} max={6} step={1} />
                            <Label>Email</Label>
                            <Input placeholder="name@example.com" />
                          </div>
                          <DialogFooter>
                            <Button onClick={() => toast.success('Заказ оформлен')}>
                              Оплатить
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={setCalendarDate}
                      className="rounded-md border"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="text-sm text-muted-foreground">Сезон: {season}</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        Состав команд
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="font-medium mb-1">Стартовый состав</div>
                      <ul className="text-sm space-y-1">
                        <li>Форвард — №9</li>
                        <li>Полузащитник — №10</li>
                        <li>Защитник — №4</li>
                      </ul>
                    </PopoverContent>
                  </Popover>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ближайшие матчи</CardTitle>
                  <CardDescription>Расписание на ближайшие дни</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingMatches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-medium">{match.homeTeam}</div>
                            <div className="text-xs text-muted-foreground">vs</div>
                            <div className="font-medium">{match.awayTeam}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {match.venue}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{formatMatchDate(match.date)}</div>
                          <Badge variant="outline" className="mt-1">
                            {match.status === 'upcoming' ? 'Предстоящий' : match.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Динамика голов по минутам</CardTitle>
                  <CardDescription>Статистика по выбранному сезону</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px]">
                    <LineChart data={goalsByMinute} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="minute" />
                      <YAxis allowDecimals={false} />
                      <ReTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="goals"
                        stroke="var(--color-goals)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="justify-end">
                  <Pagination>
                    <PaginationContent>
                      <PaginationPrevious href="#" />
                      <PaginationItem>
                        <PaginationLink href="#">1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>
                          2
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#">3</PaginationLink>
                      </PaginationItem>
                      <PaginationEllipsis />
                      <PaginationNext href="#" />
                    </PaginationContent>
                  </Pagination>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Table */}
            <TabsContent value="table" className="space-y-6">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={60}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Турнирная таблица</CardTitle>
                      <CardDescription>Премьер-лига — {season}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Команда</TableHead>
                            <TableHead>И</TableHead>
                            <TableHead>В</TableHead>
                            <TableHead>Н</TableHead>
                            <TableHead>П</TableHead>
                            <TableHead>Мячи</TableHead>
                            <TableHead>Очки</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.map((row) => (
                            <ContextMenu key={row.pos}>
                              <ContextMenuTrigger asChild>
                                <TableRow className="cursor-context-menu">
                                  <TableCell>{row.pos}</TableCell>
                                  <TableCell className="font-medium flex items-center gap-2">
                                    <Badge variant={row.pos <= 2 ? 'default' : 'secondary'}>
                                      {row.pos <= 2 ? (
                                        <Trophy className="size-3" />
                                      ) : (
                                        <Shield className="size-3" />
                                      )}
                                      {row.pos <= 2 ? 'Еврокубки' : 'Лига'}
                                    </Badge>
                                    {row.team}
                                  </TableCell>
                                  <TableCell>{row.p}</TableCell>
                                  <TableCell>{row.w}</TableCell>
                                  <TableCell>{row.d}</TableCell>
                                  <TableCell>{row.l}</TableCell>
                                  <TableCell>
                                    {row.gf}:{row.ga}
                                  </TableCell>
                                  <TableCell>{row.pts}</TableCell>
                                </TableRow>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuLabel>{row.team}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuGroup>
                                  <ContextMenuItem
                                    onClick={() => toast.info(`Показать профиль: ${row.team}`)}
                                  >
                                    Профиль
                                  </ContextMenuItem>
                                  <ContextMenuItem onClick={() => toast('Добавлено в избранное')}>
                                    Добавить в избранное
                                  </ContextMenuItem>
                                </ContextMenuGroup>
                              </ContextMenuContent>
                            </ContextMenu>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Новости</CardTitle>
                      <CardDescription>Прокрутите список</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] pr-4">
                        <ul className="space-y-3 text-sm">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Badge variant="outline">{i + 1}</Badge>
                              <span>Матч дня: обзор главных моментов тура №{i + 1}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>

            {/* Players */}
            <TabsContent value="players" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Поиск игрока</CardTitle>
                  <CardDescription>Откройте палитру команд</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setOpenCmd(true)}>
                    <Search className="size-4" /> Открыть поиск
                  </Button>
                  <ToggleGroup type="single" variant="outline">
                    <ToggleGroupItem value="433">4-3-3</ToggleGroupItem>
                    <ToggleGroupItem value="442">4-4-2</ToggleGroupItem>
                    <ToggleGroupItem value="352">3-5-2</ToggleGroupItem>
                  </ToggleGroup>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Star className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Избранные игроки</TooltipContent>
                  </Tooltip>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="outline">
                        <Shield className="size-4" /> Клуб
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64">
                      <div className="font-medium">Зенит</div>
                      <p className="text-sm text-muted-foreground">
                        Основан: 1925, стадион Газпром Арена
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </CardContent>
                <CardFooter className="gap-3 flex-col sm:flex-row">
                  <div className="grid gap-1 w-full sm:w-auto">
                    <Label>Фамилия игрока</Label>
                    <Input placeholder="Например, Дзюба" className="w-[260px]" />
                  </div>
                  <div className="grid gap-1 w-full sm:w-auto">
                    <Label>Комментарий</Label>
                    <Textarea placeholder="Опишите качества игрока..." className="w-[260px]" />
                  </div>
                  <div className="grid gap-1 w-full sm:w-auto">
                    <Label>Подтверждение</Label>
                    <InputOTP maxLength={6}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="grid gap-1 w-full sm:w-auto">
                    <Label>Прогресс скаутинга</Label>
                    <Progress value={64} className="w-[200px]" />
                  </div>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Фото стадиона</CardTitle>
                  <CardDescription>Карусель с изображениями</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Carousel>
                      <CarouselContent className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <CarouselItem key={i} className="basis-full">
                            <AspectRatio ratio={16 / 9}>
                              <div className="h-full w-full rounded-md border grid place-items-center bg-muted">
                                Слайд #{i + 1}
                              </div>
                            </AspectRatio>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UI Misc */}
            <TabsContent value="ui" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Формы и элементы</CardTitle>
                  <CardDescription>Чекбоксы, радио, селекты, переключатели</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="cb1" defaultChecked />
                      <Label htmlFor="cb1">Показывать результаты в реальном времени</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="cb2" />
                      <Label htmlFor="cb2">Показывать только домашние матчи</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Схема</Label>
                      <RadioGroup defaultValue="433">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="433" id="f1" />
                          <Label htmlFor="f1">4-3-3</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="442" id="f2" />
                          <Label htmlFor="f2">4-4-2</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Клуб</Label>
                      <Select defaultValue="Спартак">
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sw-demo">Push-уведомления</Label>
                      <Switch id="sw-demo" />
                    </div>
                    <div className="space-y-1">
                      <Label>Громкость трансляции</Label>
                      <Slider defaultValue={[30]} className="w-[220px]" />
                    </div>
                    <div className="space-y-1">
                      <Label>Код подтверждения</Label>
                      <InputOTP maxLength={4}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Toggle aria-label="bold">B</Toggle>
                      <Toggle aria-label="italic">I</Toggle>
                      <Toggle aria-label="underline">U</Toggle>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>FAQ и примеры</CardTitle>
                  <CardDescription>Аккордеон, Попапы, Диалоги, Дроуэр</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="q1">
                      <AccordionTrigger>Как получить билеты на дерби?</AccordionTrigger>
                      <AccordionContent>
                        Используйте кнопку «Купить билеты» и выберите количество.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="q2">
                      <AccordionTrigger>Где смотреть трансляцию?</AccordionTrigger>
                      <AccordionContent>
                        Трансляции доступны на официальном сайте лиги и у партнёров.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Открыть диалог</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Подтверждение</DialogTitle>
                          <DialogDescription>
                            Вы уверены, что хотите оформить подписку?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="ghost">Отмена</Button>
                          <Button onClick={() => toast.success('Подписка активирована')}>
                            Подтвердить
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Drawer>
                      <DrawerTrigger asChild>
                        <Button>Открыть дроуэр</Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Фильтры трансляций</DrawerTitle>
                          <DrawerDescription>
                            Настройте качество и язык комментариев
                          </DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 space-y-3">
                          <Label>Качество</Label>
                          <Select defaultValue="1080p">
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="720p">720p</SelectItem>
                              <SelectItem value="1080p">1080p</SelectItem>
                              <SelectItem value="4k">4K</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DrawerFooter>
                          <DrawerClose asChild>
                            <Button variant="outline">Закрыть</Button>
                          </DrawerClose>
                          <Button onClick={() => toast('Сохранено')}>Сохранить</Button>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Сторонние элементы</CardTitle>
                  <CardDescription>Breadcrumb, Skeleton, AspectRatio</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm mb-2">Загрузка карточки игрока</div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-[160px]" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm mb-2">Соотношение сторон 16:9</div>
                    <AspectRatio ratio={16 / 9}>
                      <div className="h-full w-full bg-muted rounded-md grid place-items-center">
                        Видео хайлайтов
                      </div>
                    </AspectRatio>
                  </div>
                  <div>
                    <div className="text-sm mb-2">Подсказка</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline">
                          <Flag className="size-4" /> Жалоба
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Пожаловаться на событие</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Сайдбар (демо)</CardTitle>
                  <CardDescription>Скрываемый сайдбар для навигации по клубам</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <SidebarProvider>
                      <Sidebar variant="inset">
                        <SidebarHeader>
                          <SidebarInput placeholder="Поиск клуба..." />
                        </SidebarHeader>
                        <SidebarContent>
                          <SidebarGroup>
                            <SidebarGroupLabel>Клубы</SidebarGroupLabel>
                            <SidebarGroupContent>
                              <SidebarMenu>
                                {teams.map((t) => (
                                  <SidebarMenuItem key={t.id}>
                                    <SidebarMenuButton>{t.name}</SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            </SidebarGroupContent>
                          </SidebarGroup>
                        </SidebarContent>
                        <SidebarSeparator />
                      </Sidebar>
                      <SidebarInset className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <SidebarTrigger />
                          <span className="text-sm text-muted-foreground">Переключить сайдбар</span>
                        </div>
                        <div className="text-sm">Контент страницы с информацией о клубе…</div>
                      </SidebarInset>
                    </SidebarProvider>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Prose className="text-sm text-muted-foreground">
            <p>
              Это демонстрационная страница. Компоненты подобраны под тематику футбола и используют
              русские подписи.
            </p>
          </Prose>
        </Container>
      </Section>

      {/* Command Palette */}
      <CommandDialog
        open={openCmd}
        onOpenChange={setOpenCmd}
        title="Поиск"
        description="Найдите клуб или игрока"
      >
        <CommandInput placeholder="Введите запрос…" />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          <CommandGroup heading="Клубы">
            {teams.map((t) => (
              <CommandItem key={t.id} onSelect={() => toast(`Клуб: ${t.name}`)}>
                {t.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSep />
          <CommandGroup heading="Действия">
            <CommandItem onSelect={() => toast.success('Подписка на новости оформлена')}>
              Подписаться на новости
            </CommandItem>
            <CommandItem onSelect={() => toast.info('Открытие настроек')}>
              Открыть настройки
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </TooltipProvider>
  )
}

// Helpers
export function FilterDot() {
  return (
    <span className="relative inline-flex items-center gap-2">
      Фильтры
      <span className="absolute -right-2 -top-1 inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  )
}

export default UIDemo
