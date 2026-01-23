# 🐳 Деплой через Docker с интеграцией подсчёта статистики

## ✅ Что изменилось

1. **package.json обновлён** - все скрипты теперь используют `tsx` вместо `--loader`
2. **tsx добавлен в dependencies** - будет установлен в Docker контейнере
3. **Интеграция подсчёта статистики** - работает автоматически при импорте матчей

---

## 🚀 Деплой на сервер

### Шаг 1: Закоммитить изменения

```bash
# Локально
git add package.json
git add scripts/matches-history-sync.mjs
git add scripts/calculate-predictions-for-match.mjs
git add src/lib/prediction-stats-calculator.ts
git commit -m "feat: интеграция подсчёта статистики прогнозов в импорт матчей"
git push origin main
```

### Шаг 2: Обновить код на сервере

```bash
# На сервере
cd /root/ro-ko-football
git pull origin main
```

### Шаг 3: Пересобрать Docker образ

```bash
# На сервере
cd /root/ro-ko-football

# Остановить текущие контейнеры
docker-compose -f docker-compose.matches-import-forward.yml down

# Пересобрать образ
docker-compose -f docker-compose.matches-import-forward.yml build --no-cache

# Запустить
docker-compose -f docker-compose.matches-import-forward.yml up -d
```

### Шаг 4: Проверить логи

```bash
# Смотреть логи в реальном времени
docker-compose -f docker-compose.matches-import-forward.yml logs -f

# Должны увидеть:
# [STATS] CREATED для matchId=...
# [PREDICTIONS] Поиск прогнозов для fixtureId=...
# [PREDICTIONS] ✅ Статистика создана...
```

---

## 🔧 Альтернативный способ (без пересборки)

Если не хотите пересобирать образ:

### Вариант 1: Установить tsx в работающем контейнере

```bash
# Войти в контейнер
docker exec -it <container_name> sh

# Установить tsx
pnpm add tsx

# Выйти
exit

# Перезапустить контейнер
docker-compose -f docker-compose.matches-import-forward.yml restart
```

### Вариант 2: Обновить только код

```bash
# На сервере
cd /root/ro-ko-football
git pull origin main

# Скопировать файлы в контейнер
docker cp package.json <container_name>:/app/
docker cp scripts/ <container_name>:/app/
docker cp src/ <container_name>:/app/

# Войти в контейнер и установить зависимости
docker exec -it <container_name> sh
pnpm install
exit

# Перезапустить
docker-compose -f docker-compose.matches-import-forward.yml restart
```

---

## 📋 Проверка работы

### 1. Проверить что контейнер запущен

```bash
docker ps | grep matches
```

### 2. Проверить логи

```bash
docker-compose -f docker-compose.matches-import-forward.yml logs --tail=100
```

Должны увидеть:

```
[LOOP] Запуск в режиме постоянной работы с интервалом 600 сек
[SYNC] Синхронизация матчей...
[STATS] CREATED (statsId=...) для matchId=...
[PREDICTIONS] Поиск прогнозов для fixtureId=...
[PREDICTIONS] Найдено X прогноз(ов)
[PREDICTIONS] ✅ Статистика создана...
```

### 3. Проверить в MongoDB

```bash
# Подключиться к MongoDB
mongosh mongodb://syncadmin:syncadminsyncadmin123qQ!@127.0.0.1:27017/payload?authSource=admin

# Проверить статистику прогнозов
use payload
db.predictionStats.find().sort({evaluatedAt: -1}).limit(5)

# Проверить количество
db.predictionStats.countDocuments()
```

---

## 🐛 Решение проблем

### Проблема: "Cannot find module Users"

**Причина:** Старый loader не работает с TypeScript импортами

**Решение:**

```bash
# Убедитесь что package.json обновлён с tsx
cat package.json | grep "tsx scripts"

# Если нет, обновите вручную:
nano package.json
# Замените ��се "node --loader @esbuild-kit/esm-loader" на "tsx"

# Пересоберите образ
docker-compose -f docker-compose.matches-import-forward.yml build --no-cache
docker-compose -f docker-compose.matches-import-forward.yml up -d
```

### Проблема: "DATABASE_URI invalid scheme"

**Причина:** .env файл не загружается или DATABASE_URI неправильный

**Решение:**

```bash
# Проверить .env
cat .env | grep DATABASE_URI

# Проверить docker-compose.yml
cat docker-compose.matches-import-forward.yml | grep DATABASE_URI

# Убедиться что DATABASE_URI правильный:
# mongodb://user:pass@host:port/database?authSource=admin
```

### Проблема: ExperimentalWarning

**Причина:** Используется старый --loader

**Решение:** Обновить package.json на tsx (уже сделано)

---

## 📊 Мониторинг

### Настроить автоматический рестарт

Docker compose уже настроен с `restart: unless-stopped`, но можно добавить healthcheck:

```yaml
# docker-compose.matches-import-forward.yml
services:
  matches_import_forward:
    # ... остальное
    healthcheck:
      test: ['CMD', 'pgrep', '-f', 'tsx']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Логирование

```bash
# Сохранить логи в файл
docker-compose -f docker-compose.matches-import-forward.yml logs > matches-import.log

# Следить за логами с фильтром
docker-compose -f docker-compose.matches-import-forward.yml logs -f | grep PREDICTIONS
```

---

## 🎯 Итоговый чеклист

- [ ] Код обновлён на сервере (`git pull`)
- [ ] package.json содержит `tsx` в dependencies
- [ ] Все скрипты используют `tsx` вместо `--loader`
- [ ] Docker образ пересобран
- [ ] Контейнер запущен
- [ ] Логи показывают `[PREDICTIONS]` сообщения
- [ ] В MongoDB появляются записи в `predictionStats`
- [ ] Нет ошибок "Cannot find module"
- [ ] Нет ошибок "Invalid scheme"

---

## 🚀 Быстрый деплой (одна команда)

```bash
# На сервере
cd /root/ro-ko-football && \
git pull origin main && \
docker-compose -f docker-compose.matches-import-forward.yml down && \
docker-compose -f docker-compose.matches-import-forward.yml build --no-cache && \
docker-compose -f docker-compose.matches-import-forward.yml up -d && \
docker-compose -f docker-compose.matches-import-forward.yml logs -f
```

---

## 📞 Поддержка

Если что-то не работает:

1. Проверить логи: `docker-compose -f docker-compose.matches-import-forward.yml logs --tail=200`
2. Проверить что контейнер запущен: `docker ps`
3. Войти в контейнер: `docker exec -it <container_name> sh`
4. Проверить файлы: `ls -la /app/scripts/`
5. Проверить зависимости: `pnpm list tsx`

Готово! 🎉
