import { getPayload } from 'payload'
import config from '../src/payload.config.js'

async function checkSchema() {
  console.log('🔍 Проверяем схему Outcome Groups...\n')

  const payload = await getPayload({ config })

  // Получаем один outcome group для проверки
  const groups = await payload.find({
    collection: 'outcome-groups',
    limit: 1,
  })

  if (groups.docs.length === 0) {
    console.log('✅ Нет данных в outcome-groups')
    console.log('Создайте новую группу через админку')
    process.exit(0)
  }

  const group = groups.docs[0]
  console.log(`📦 Группа: ${group.name}`)
  console.log(`📊 Количество исходов: ${group.outcomes?.length || 0}\n`)

  if (group.outcomes && group.outcomes.length > 0) {
    const outcome = group.outcomes[0]
    console.log(`🎯 Первый исход: ${outcome.name}`)
    console.log(`\n📋 Поля исхода:`)
    console.log(JSON.stringify(Object.keys(outcome), null, 2))

    console.log(`\n📄 Полная структур��:`)
    console.log(JSON.stringify(outcome, null, 2))
  }

  process.exit(0)
}

checkSchema().catch((err) => {
  console.error('❌ Ошибка:', err)
  process.exit(1)
})
