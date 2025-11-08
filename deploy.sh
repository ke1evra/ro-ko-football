#!/bin/bash
# Универсальный скрипт деплоя для rocoscore.ru
# Цели:
# - Подготовка системы (Docker/Compose, системные зависимости, pnpm)
# - Подготовка .env, установка зависимостей проекта
# - Сборка и запуск docker-compose.appstack.yml
# - Ожидание health'ов и HTTP-пробы
# - Полное логирование в deploy.log

set -eu

# -------------------- vars --------------------
CWD="$(pwd)"
COMPOSE_FILE="$CWD/docker-compose.appstack.yml"
ENV_FILE="$CWD/.env"
ENV_EXAMPLE_FILE="$CWD/.env.example"
LOG_FILE="$CWD/deploy.log"
MODE="${MODE:-prod}"
FORCE_PORTS="${FORCE_PORTS:-0}"

# -------------------- utils --------------------
ts() {
  date +"%Y-%m-%dT%H:%M:%S"
}
write_log() {
  echo "[$(ts)] $*" >> "$LOG_FILE"
}
log() {
  echo "$*"
  write_log "$*"
}
warn() {
  echo "WARN: $*" >&2
  write_log "WARN: $*"
}
fail() {
  echo "ERROR: $*" >&2
  write_log "ERROR: $*"
  exit 1
}
run() {
  log "$ $1"
  if ! eval "$1" >> "$LOG_FILE" 2>&1; then
    fail "Команда завершилась с ошибкой: $1"
  fi
}
try_run() {
  write_log "$ $1"
  if eval "$1" >> "$LOG_FILE" 2>&1; then
    return 0
  else
    return 1
  fi
}
cmd_exists() {
  command -v "$1" >/dev/null 2>&1
}
generate_secret() {
  openssl rand -hex 32
}
port_busy() {
  local port="$1"
  if timeout 1 bash -c "</dev/tcp/127.0.0.1/$port" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}
http_probe() {
  local url="$1"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "0")"
  echo "$status"
}
sleep() {
  sleep "$1"
}

# -------------------- init --------------------
# очистим старый лог
rm -f "$LOG_FILE"
write_log "=== START DEPLOY ==="
log "== Предпроверки окружения =="

# -------------------- system prep --------------------
log "== Подготовка системы =="
export DEBIAN_FRONTEND=noninteractive
run "apt-get update -y"
run "apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release jq build-essential python3 make g++ pkg-config"

# -------------------- docker install --------------------
log "== Установка Docker =="
if ! cmd_exists docker; then
  log "Docker не найден. Устанавливаю..."
  # проверка root
  if [[ $EUID -ne 0 ]]; then
    fail "Для установки Docker запустите скрипт под root (sudo)."
  fi
  # удалить старые
  try_run "apt-get remove -y docker docker-engine docker.io containerd runc || true"
  run "apt-get autoremove -y"
  run "apt-get update -y"
  run "apt-get install -y --no-install-recommends apt-transport-https software-properties-common ca-certificates curl gnupg lsb-release"
  run "install -m 0755 -d /etc/apt/keyrings"
  run "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg"
  run "chmod a+r /etc/apt/keyrings/docker.gpg"
  run "echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" > /etc/apt/sources.list.d/docker.list"
  run "apt-get update -y"

  apt_fix() {
    warn "Пробую исправить зависимости apt..."
    try_run "dpkg --configure -a || true"
    try_run "apt --fix-broken install -y || true"
    try_run "apt-get -o Dpkg::Options::=--force-confnew -f install -y || true"
  }

  # Сначала Ubuntu repo
  if ! run "apt-get -o Dpkg::Options::=--force-confnew install -y docker.io docker-compose-plugin"; then
    warn "Установка docker.io не удалась. Попытка исправления и повтор..."
    apt_fix
    if ! run "apt-get -o Dpkg::Options::=--force-confnew install -y docker.io docker-compose-plugin"; then
      warn "Повторная установка docker.io не удалась. Пытаюсь docker-ce..."
      apt_fix
      if ! run "apt-get -o Dpkg::Options::=--force-confnew install -y docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin"; then
        apt_fix
        run "apt-get -o Dpkg::Options::=--force-confnew install -y docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin"
      fi
    fi
  fi
  try_run "systemctl enable docker"
  try_run "systemctl start docker"
fi
run "docker --version"
run "docker compose version"

# -------------------- pnpm install --------------------
log "== Установка pnpm =="
if ! cmd_exists pnpm; then
  log "pnpm не найден. Активирую через corepack..."
  if cmd_exists corepack; then
    try_run "corepack enable"
    try_run "corepack prepare pnpm@latest --activate"
  fi
  if ! cmd_exists pnpm && cmd_exists npm; then
    warn "corepack недоступен или не активировал pnpm — устанавливаю глобально через npm"
    try_run "npm install -g pnpm"
  fi
fi
if cmd_exists pnpm; then
  run "pnpm --version"
else
  warn "pnpm недоступен. Будет использован npm."
fi

# -------------------- repo setup --------------------
log "== Установка зависимостей проекта =="
if cmd_exists git; then
  log "Обновление репозитория..."
  try_run "git fetch --all --prune"
  try_run "git pull --ff-only"
fi
if cmd_exists pnpm; then
  run "pnpm install --frozen-lockfile"
elif cmd_exists npm; then
  warn "pnpm недоступен — выполняю установку через npm"
  if [[ -f "$CWD/package-lock.json" ]]; then
    run "npm ci"
  else
    run "npm install"
  fi
else
  fail "Не найден ни pnpm, ни npm для установки зависимостей"
fi

# -------------------- .env setup --------------------
log "== Настройка .env =="
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
    fail ".env отсутствует и .env.example не найден"
  fi
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  log "Создан .env из .env.example"
  write_log "$(cat "$ENV_FILE")"
fi
# обновить переменные
if [[ "$MODE" == "prod" ]]; then
  target_url="https://rocoscore.ru"
  node_env="production"
else
  target_url="http://localhost"
  node_env="development"
fi
sed -i "s|^DATABASE_URI=.*|DATABASE_URI=mongodb://mongo:27017/payload|" "$ENV_FILE"
if grep -q "^PAYLOAD_SECRET=your-secret-key-here" "$ENV_FILE"; then
  secret="$(generate_secret)"
  sed -i "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$secret|" "$ENV_FILE"
fi
sed -i "s|^NODE_ENV=.*|NODE_ENV=$node_env|" "$ENV_FILE"
sed -i "s|^APP_URL=.*|APP_URL=$target_url|" "$ENV_FILE"
log "Файл .env обновлён для режима $MODE"
masked_secret="$(grep '^PAYLOAD_SECRET=' "$ENV_FILE" | cut -d'=' -f2 | cut -c1-6)***"
write_log "Текущий .env (секреты частично скрыты): $(grep -v '^PAYLOAD_SECRET=' "$ENV_FILE"; echo "PAYLOAD_SECRET=$masked_secret")"

# -------------------- docker networks --------------------
log "== Подготовка Docker сетей =="
if ! try_run "docker network inspect web"; then
  run "docker network create web"
else
  log "Сеть web уже существует"
fi
if ! try_run "docker network inspect private"; then
  run "docker network create private"
else
  log "Сеть private уже существует"
fi

# -------------------- ports check --------------------
log "== Проверка портов 80/443 =="
busy80=0
busy443=0
if port_busy 80; then busy80=1; fi
if port_busy 443; then busy443=1; fi
if [[ $((busy80 + busy443)) -gt 0 && $FORCE_PORTS -eq 0 ]]; then
  warn "Порты заняты: 80=$busy80, 443=$busy443"
  # Попытаемся остановить сервисы
  if [[ $EUID -eq 0 ]]; then
    for svc in nginx apache2 caddy traefik haproxy; do
      if try_run "systemctl is-active $svc"; then
        warn "Обнаружен активный сервис $svc, пытаюсь остановить..."
        try_run "systemctl stop $svc"
        try_run "systemctl disable $svc"
      fi
    done
  fi
  # Повторная проверка
  busy80b=0
  busy443b=0
  if port_busy 80; then busy80b=1; fi
  if port_busy 443; then busy443b=1; fi
  if [[ $((busy80b + busy443b)) -gt 0 ]]; then
    warn "После попытки остановки сервисов порты заняты: 80=$busy80b, 443=$busy443b"
    warn "Завершение. Запустите с FORCE_PORTS=1 для теста или освободите порты."
    exit 2
  else
    log "Порты 80/443 освобождены автоматически."
  fi
fi

# -------------------- compose build+up --------------------
log "== Сборка и запуск docker-compose =="
if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "docker-compose.appstack.yml не найден"
fi
run "docker compose -f $COMPOSE_FILE config"
run "docker compose -f $COMPOSE_FILE build --pull"
run "docker compose -f $COMPOSE_FILE up -d"
run "docker compose -f $COMPOSE_FILE ps"

# -------------------- wait health --------------------
log "== Ожидание готовности сервисов =="
wait_healthy() {
  local name="$1"
  local timeout_ms="${2:-300000}"
  local started
  started="$(date +%s%3N)"
  while [[ $(( $(date +%s%3N) - started )) -lt $timeout_ms ]]; do
    if try_run "docker inspect --format='{{json .State.Health}}' $name"; then
      local status
      status="$(docker inspect --format='{{json .State.Health.Status}}' "$name" 2>/dev/null || echo 'null')"
      if [[ "$status" == '"healthy"' ]]; then
        return 0
      fi
    fi
    sleep 3
  done
  return 1
}

if ! wait_healthy mongo; then
  warn "Mongo не перешёл в healthy"
  try_run "docker compose -f $COMPOSE_FILE logs mongo | tail -n 200"
fi
if ! wait_healthy payload; then
  warn "Payload не перешёл в healthy"
  try_run "docker compose -f $COMPOSE_FILE logs payload | tail -n 200"
fi
if ! wait_healthy next; then
  warn "Next не перешёл в healthy"
  try_run "docker compose -f $COMPOSE_FILE logs next | tail -n 200"
fi

# -------------------- probes --------------------
log "== HTTP проверки =="
if [[ "$MODE" == "prod" ]]; then
  base_url="https://rocoscore.ru"
else
  base_url="http://localhost"
fi
checks=(
  "$base_url/ frontend /"
  "$base_url/api/health payload /api/health"
  "$base_url/admin payload admin"
)
for check in "${checks[@]}"; do
  url="$(echo "$check" | awk '{print $1}')"
  name="$(echo "$check" | awk '{print $2 " " $3}')"
  status="$(http_probe "$url")"
  log "$name: $url -> status $status"
done

write_log "=== END DEPLOY ==="
log ""
log "== Готово =="
log "Управление:"
log "  docker compose -f $COMPOSE_FILE ps"
log "  docker compose -f $COMPOSE_FILE logs -f --tail=200"
log "  docker compose -f $COMPOSE_FILE up -d --build"
log "  docker compose -f $COMPOSE_FILE down"
log ""
log "Подсказки:"
log "- Для автоматического выпуска публичных сертификатов удалите caddy.tls: \"internal\" из compose и убедитесь, что DNS rocoscore.ru указывает на сервер, а порты 80/443 свободны."
log "- Для локального прогона: MODE=local sh deploy.sh"
log "- При занятых портах: FORCE_PORTS=1 sh deploy.sh"