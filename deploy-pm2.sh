#!/bin/bash
# ============================================================
# deploy-pm2.sh — деплой Next.js standalone на сервер через PM2
# Использование: sh deploy-pm2.sh
# ============================================================
set -euo pipefail

# ── Настройки ────────────────────────────────────────────────
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_HOST="${DEPLOY_HOST:-91.209.135.34}"
SERVER_PATH="${DEPLOY_PATH:-/var/www/football-platform}"
PM2_APP="${PM2_APP:-football-platform}"
# ─────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $*${NC}"; }
info() { echo -e "${YELLOW}▶ $*${NC}"; }
fail() { echo -e "${RED}✖ $*${NC}"; exit 1; }

SSH="ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST}"
RSYNC_DEST="${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"

# ── Шаг 1: сборка ────────────────────────────────────────────
info "Шаг 1/5 — сборка проекта (pnpm build)"
pnpm build || fail "Сборка завершилась с ошибкой"
ok "Сборка завершена"

# ── Шаг 2: копирование статики в standalone ──────────────────
info "Шаг 2/5 — копирование статики в standalone"
cp -r .next/static   .next/standalone/.next/static
cp -r public         .next/standalone/public
ok "Статика скопирована"

# ── Шаг 3: генерация .env для продакшена ─────────────────────
info "Шаг 3/5 — генерация .env для standalone (продакшн)"

# Читаем нужные переменные из локального .env
PAYLOAD_SECRET="$(grep '^PAYLOAD_SECRET=' .env | cut -d'=' -f2)"
LIVESCORE_KEY="$(grep '^LIVESCORE_KEY=' .env | cut -d'=' -f2)"
LIVESCORE_SECRET="$(grep '^LIVESCORE_SECRET=' .env | cut -d'=' -f2)"
LIVESCORE_API_BASE="$(grep '^LIVESCORE_API_BASE=' .env | cut -d'=' -f2)"

cat > .next/standalone/.env <<EOF
DATABASE_URI=mongodb://syncuser:strongpassword@localhost:27017/payload
PAYLOAD_SECRET=${PAYLOAD_SECRET}
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_SITE_URL=https://rocoscore.ru
LIVESCORE_KEY=${LIVESCORE_KEY}
LIVESCORE_SECRET=${LIVESCORE_SECRET}
LIVESCORE_API_BASE=${LIVESCORE_API_BASE}
EOF

ok ".env создан"

# ── Шаг 4: синхронизация на сервер ───────────────────────────
info "Шаг 4/5 — rsync → ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}"

# Создаём директорию на сервере если нет
$SSH "mkdir -p ${SERVER_PATH}"

rsync -avz --delete \
  --exclude='logs/' \
  .next/standalone/ \
  "${RSYNC_DEST}/"

# Копируем ecosystem.config.cjs отдельно (он вне standalone)
rsync -avz ecosystem.config.cjs "${RSYNC_DEST}/ecosystem.config.cjs"

ok "Файлы загружены на сервер"

# ── Шаг 5: перезапуск PM2 на сервере ─────────────────────────
info "Шаг 5/5 — перезапуск PM2 на сервере"

$SSH bash <<REMOTE
  set -e
  cd "${SERVER_PATH}"

  # Устанавливаем PM2 если нет
  if ! command -v pm2 &>/dev/null; then
    echo "Устанавливаю PM2..."
    npm install -g pm2
  fi

  # Перезапуск или первый запуск
  if pm2 list | grep -q "${PM2_APP}"; then
    pm2 reload "${PM2_APP}" --update-env
    echo "PM2 перезагружен (reload)"
  else
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "PM2 запущен впервые, сохранён список процессов"
  fi

  pm2 status
REMOTE

ok "Деплой завершён!"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Сайт: https://rocoscore.ru (порт ${SERVER_HOST}:4317)"
echo -e "  Логи: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs ${PM2_APP}'"
echo -e "  Статус: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 status'"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
