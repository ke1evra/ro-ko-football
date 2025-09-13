/**
 * Компонент турнирной таблицы для конкретного соревнования
 * Работает напрямую с данными из базы данных
 */

import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, BarChart3 } from 'lucide-react'

interface CompetitionStandingsTableProps {
  competitionId: string
  season?: string
}

export default async function CompetitionStandingsTable({
  competitionId,
  season = '2024-25',
}: CompetitionStandingsTableProps) {
  try {
    // Коллекция 'standings' пока не создана, возвращаем заглушку
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Турнирная таблица для этого соревнования пока не синхронизирована.
        </AlertDescription>
      </Alert>
    )

    // Код для работы с коллекцией standings (будет активирован после создания коллекции):
    // const payload = await getPayload({ config })
    // const standings = await payload.find({
    //   collection: 'standings',
    //   where: {
    //     and: [
    //       { competition: { equals: competitionId } },
    //       { season: { equals: season } },
    //       { isActive: { equals: true } },
    //     ],
    //   },
    //   limit: 1,
    //   sort: '-lastUpdated',
    //   depth: 2,
    // })
    // if (standings.docs.length === 0) {
    //   return (
    //     <Alert>
    //       <AlertCircle className="h-4 w-4" />
    //       <AlertDescription>
    //         Турнирная таблица для этого соревнования пока не синхронизирована.
    //       </AlertDescription>
    //     </Alert>
    //   )
    // }
    // const standingsDoc = standings.docs[0]
    // const rows = standingsDoc.rows || []
    //
    // if (rows.length === 0) {
    //   return (
    //     <Alert>
    //       <AlertCircle className="h-4 w-4" />
    //       <AlertDescription>Данные турнирной таблицы отсутствуют.</AlertDescription>
    //     </Alert>
    //   )
    // }
    //
    // return (
    //   <div className="space-y-4">
    //     {/* Заголовок с информацией об обновлении */}
    //     <div className="flex items-center justify-between">
    //       <div className="flex items-center gap-2">
    //         <BarChart3 className="h-5 w-5" />
    //         <span className="font-medium">Турнирная таблица</span>
    //       </div>
    //       <div className="flex items-center gap-2">
    //         <Badge variant="outline" className="text-xs">
    //           Обновлено: {new Date(standingsDoc.lastUpdated).toLocaleDateString('ru-RU')}
    //         </Badge>
    //         <Badge
    //           variant={standingsDoc.syncStatus === 'synced' ? 'default' : 'secondary'}
    //           className="text-xs"
    //         >
    //           {standingsDoc.syncStatus === 'synced' ? 'Актуально' : 'Требует обновления'}
    //         </Badge>
    //       </div>
    //     </div>
    //
    //     {/* Таблица */}
    //     <div className="rounded-md border">
    //       <Table>
    //         <TableHeader>
    //           <TableRow>
    //             <TableHead className="w-12">#</TableHead>
    //             <TableHead>Команда</TableHead>
    //             <TableHead className="text-center w-12">И</TableHead>
    //             <TableHead className="text-center w-12">В</TableHead>
    //             <TableHead className="text-center w-12">Н</TableHead>
    //             <TableHead className="text-center w-12">П</TableHead>
    //             <TableHead className="text-center w-16">Мячи</TableHead>
    //             <TableHead className="text-center w-12">О</TableHead>
    //             <TableHead className="text-center w-20">Форма</TableHead>
    //           </TableRow>
    //         </TableHeader>
    //         <TableBody>
    //           {rows.map((row, index) => (
    //             <TableRow key={`${row.teamId}-${index}`}>
    //               <TableCell className="font-medium text-center">{row.rank}</TableCell>
    //               <TableCell>
    //                 <div className="flex items-center gap-2">
    //                   <span className="font-medium">{row.teamName}</span>
    //                 </div>
    //               </TableCell>
    //               <TableCell className="text-center">{row.played}</TableCell>
    //               <TableCell className="text-center text-green-600">{row.wins}</TableCell>
    //               <TableCell className="text-center text-yellow-600">{row.draws}</TableCell>
    //               <TableCell className="text-center text-red-600">{row.losses}</TableCell>
    //               <TableCell className="text-center">
    //                 <span className="text-sm">
    //                   {row.goalsFor}:{row.goalsAgainst}
    //                 </span>
    //               </TableCell>
    //               <TableCell className="text-center font-bold">{row.points}</TableCell>
    //               <TableCell className="text-center">
    //                 {row.form ? (
    //                   <div className="flex gap-1 justify-center">
    //                     {row.form.split('').map((result: string, i: number) => (
    //                       <div
    //                         key={i}
    //                         className={`w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-bold ${
    //                           result === 'W'
    //                             ? 'bg-green-500'
    //                             : result === 'D'
    //                               ? 'bg-yellow-500'
    //                               : 'bg-red-500'
    //                         }`}
    //                       >
    //                         {result}
    //                       </div>
    //                     ))}
    //                   </div>
    //                 ) : (
    //                   <span className="text-muted-foreground">—</span>
    //                 )}
    //               </TableCell>
    //             </TableRow>
    //           ))}
    //         </TableBody>
    //       </Table>
    //     </div>
    //
    //     {/* Информация о последнем обновлении */}
    //     <div className="text-xs text-muted-foreground text-center">
    //       Последнее обновление: {new Date(standingsDoc.lastUpdated).toLocaleString('ru-RU')}
    //       {standingsDoc.syncStatus === 'error' && standingsDoc.errorMessage && (
    //         <div className="mt-1 text-red-500">
    //           Ошибка синхронизации: {standingsDoc.errorMessage}
    //         </div>
    //       )}
    //     </div>
    //   </div>
    // )
  } catch (error) {
    console.error('Error loading competition standings:', error)

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Не удалось загрузить турнирную таблицу. Попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    )
  }
}
