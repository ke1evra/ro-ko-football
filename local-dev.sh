#!/bin/bash
# Скрипт для локального запуска с Docker
# Устанавливает зависимости, настраивает .env, поднимает стек с localhost доменами

set -eu

CWD="$(pwd)"
COMPOSE_FILE="$CWD/docker-compose.yml"
ENV_FILE="$CWD/.env"
ENV_EXAMPLE_FILE="$CWD/.env.example"
LOG_FILE="$CWD/local-dev.log"

# Utils
log() { echo "$*"; echo "[$(date +"%Y-%m-%dT%H:%M:%S")] $*" >> "$LOG_FILE"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  fail "Docker не установлен. Установите Docker Desktop или Docker Engine."
fi
if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose V2 недоступен."
fi

log "Docker OK"

# Install deps
if command -v pnpm >/dev/null 2>&1; then
  log "Установка зависимостей через pnpm..."
  pnpm install --frozen-lockfile
elif command -v npm >/dev/null 2>&1; then
  log "Установка зависимостей через npm..."
  if [ -f "$CWD/package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
else
  fail "Не найден pnpm или npm"
fi

# Setup .env
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE_FILE" ]; then
    fail ".env.example не найден"
  fi
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  log ".env создан из .env.example"
fi

# Update .env for local
sed -i.bak "s|^DATABASE_URI=.*|DATABASE_URI=mongodb://mongo:27017/payload|" "$ENV_FILE"
if grep -q "^PAYLOAD_SECRET=your-secret-key-here" "$ENV_FILE"; then
  secret="$(openssl rand -hex 32)"
  sed -i.bak "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$secret|" "$ENV_FILE"
fi
sed -i.bak "s|^NODE_ENV=.*|NODE_ENV=development|" "$ENV_FILE"
sed -i.bak "s|^APP_URL=.*|APP_URL=http://localhost:3100|" "$ENV_FILE"
log ".env настроен для локального режима"

# Create networks
docker network inspect web >/dev/null 2>&1 || docker network create web
docker network inspect private >/dev/null 2>&1 || docker network create private
log "Сети созданы"

# Build and up
log "Сборка и запуск..."
docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d

# Wait for health
log "Ожидание готовности..."
wait_healthy() {
  local name="$1"
  local timeout=300
  local count=0
  while [ $count -lt $timeout ]; do
    status="$(docker inspect --format='{{json .State.Health.Status}}' "$name" 2>/dev/null || echo 'null')"
    if [ "$status" = '"healthy"' ]; then
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  return 1
}

if ! wait_healthy mongo; then log "Mongo не healthy"; fi
if ! wait_healthy payload; then log "Payload не healthy"; fi
if ! wait_healthy next; then log "Next не healthy"; fi

log "Готово!"
log "Открывайте:"
log "  http://localhost:3100/ (фронт)"
log "  http://localhost:3101/admin (Payload)"
log "  http://localhost:3101/api/health (API)"
log ""
log "Управление:"
log "  docker compose -f $COMPOSE_FILE ps"
log "  docker compose -f $COMPOSE_FILE logs -f"
log "  docker compose -f $COMPOSE_FILE down"