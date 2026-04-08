#!/bin/bash

# Скрипт для сборки Docker образа локально и загрузки на сервер
# Запускается на локальной машине
# Использование: ./docker-build.sh [--server=user@host] [--tag=latest] [--no-push]

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

# Параметры по умолчанию
SERVER=""
TAG="latest"
PUSH=true
IMAGE_NAME="appstack"
DOCKERFILE="Dockerfile"

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
  case $1 in
    --server=*)
      SERVER="${1#*=}"
      shift
      ;;
    --tag=*)
      TAG="${1#*=}"
      shift
      ;;
    --no-push)
      PUSH=false
      shift
      ;;
    --image=*)
      IMAGE_NAME="${1#*=}"
      shift
      ;;
    *)
      warn "Неизвестный параметр: $1"
      shift
      ;;
  esac
done

# Проверка зависимостей
log "Проверка зависимостей..."
command -v docker >/dev/null 2>&1 || error "Docker не установлен"
success "Docker найден"

# Параметры образа
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

log "Параметры сборки:"
echo "  Image: $FULL_IMAGE"
echo "  Dockerfile: $DOCKERFILE"
echo "  Server: ${SERVER:-(локально)}"
echo "  Push: $PUSH"

# Проверка наличия Dockerfile
[ -f "$DOCKERFILE" ] || error "Dockerfile не найден: $DOCKERFILE"

# Сборка образа
log "Сборка Docker образа..."
docker build \
  -f "$DOCKERFILE" \
  -t "$FULL_IMAGE" \
  --progress=plain \
  .

success "Образ собран: $FULL_IMAGE"

# Если указан сервер - загружаем по SSH
if [ -n "$SERVER" ] && [ "$PUSH" = true ]; then
  log "Проверка SSH соединения с $SERVER..."
  ssh -o ConnectTimeout=5 "$SERVER" "echo 'SSH OK'" >/dev/null 2>&1 || error "Не удалось подключиться к $SERVER"
  success "SSH соединение установлено"

  # Сохраняем образ в tar
  TAR_FILE="/tmp/${IMAGE_NAME}-${TAG}.tar"
  log "Сохранение образа в tar: $TAR_FILE"
  docker save "$FULL_IMAGE" -o "$TAR_FILE"
  success "Образ сохранён ($(du -h "$TAR_FILE" | cut -f1))"

  # Загружаем tar на сервер
  log "Загрузка tar на сервер..."
  scp -q "$TAR_FILE" "$SERVER:/tmp/"
  success "Tar загружен на сервер"

  # Удаляем локальный tar
  rm "$TAR_FILE"

  log "Запуск скрипта получения образа на сервере..."
  ssh "$SERVER" "bash -s" < docker-receive.sh "$IMAGE_NAME" "$TAG"
  success "Образ получен на сервере"

  echo ""
  echo "Для перезапуска контейнера на сервере выполните:"
  echo "  ssh $SERVER 'cd /app && docker-compose up -d'"
else
  success "Образ готов локально: $FULL_IMAGE"
  echo ""
  echo "Для загрузки на сервер используйте:"
  echo "  ./docker-build.sh --server=user@host"
fi

success "Готово!"
