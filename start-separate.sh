#!/bin/bash
# Запуск сервисов по отдельности

set -eu

log() { echo "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен."
  exit 1
fi

# Создать сеть
docker network create appstack_default 2>/dev/null || true

# Запуск Mongo
log "Запуск Mongo..."
docker run -d --name mongo --network appstack_default -p 27117:27017 -v mongo_data:/data/db mongo:7 --wiredTigerCacheSizeGB=8

# Запуск Payload
log "Запуск Payload..."
docker run -d --name payload --network appstack_default -p 3101:3000 --env-file .env payload:latest

# Запуск Next
log "Запуск Next..."
docker run -d --name next --network appstack_default -p 3100:3000 --env-file .env next:latest

log "Сервисы запущены по отдельности."
log "Проверьте: docker ps"
log "Логи: docker logs <container_name>"
log "Остановить: docker stop mongo payload next && docker rm mongo payload next && docker network rm appstack_default"