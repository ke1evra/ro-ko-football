#!/bin/bash
# Запуск всех сервисов разом через docker compose

set -eu

CWD="$(pwd)"
COMPOSE_FILE="$CWD/docker-compose.yml"

log() { echo "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен."
  exit 1
fi

log "Запуск всех сервисов..."
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

log "Сервисы запущены."
log "Проверьте: docker compose -f $COMPOSE_FILE ps"
log "Логи: docker compose -f $COMPOSE_FILE logs -f"
log "Остановить: docker compose -f $COMPOSE_FILE down"