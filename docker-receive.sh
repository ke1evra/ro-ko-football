#!/bin/bash

# Скрипт для получения Docker образа на сервере
# Запускается на сервере через SSH
# Использование: ./docker-receive.sh [image_name] [tag]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Функции логирования
log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Параметры
IMAGE_NAME="${1:-appstack}"
TAG="${2:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${TAG}"
TAR_FILE="/tmp/${IMAGE_NAME}-${TAG}.tar"
COMPOSE_FILE="docker-compose.yml"

log "Получение Docker образа на сервере"
echo "  Image: $FULL_IMAGE"
echo "  Tar file: $TAR_FILE"

# Проверка наличия tar файла
if [ ! -f "$TAR_FILE" ]; then
  error "Tar файл не найден: $TAR_FILE"
fi

success "Tar файл найден ($(du -h "$TAR_FILE" | cut -f1))"

# Проверка Docker
log "Проверка Docker..."
command -v docker >/dev/null 2>&1 || error "Docker не установлен на сервере"
success "Docker найден"

# Загрузка образа
log "Загрузка образа в Docker..."
docker load -i "$TAR_FILE"
success "Образ загружен: $FULL_IMAGE"

# Удаление tar файла
log "Удаление временного tar файла..."
rm "$TAR_FILE"
success "Tar файл удалён"

# Проверка образа
log "Проверка образа..."
docker images | grep "$IMAGE_NAME" | grep "$TAG" >/dev/null || error "Образ не найден в Docker"
success "Образ проверен"

# Информация о контейнере
log "Информация об образе:"
docker inspect "$FULL_IMAGE" --format='Image: {{.RepoTags}}
Size: {{.Size | printf "%.2f MB"}}
Created: {{.Created}}
OS: {{.Os}}/{{.Architecture}}'

echo ""
success "Образ готов к использованию!"
echo ""
echo "Для перезапуска контейнера выполните:"
echo "  cd /app && docker-compose up -d"
echo ""
echo "Для просмотра логов:"
echo "  docker-compose logs -f --tail=100"
echo ""
echo "Для проверки статуса:"
echo "  docker-compose ps"
