#!/bin/sh
# Переводит последний файл экспорта названий лиг
set -eu
LATEST=$(ls -1t exports/league-names-*.json | head -1)
if [ -z "$LATEST" ]; then
  echo "Файлы экспорта не найдены (exports/league-names-*.json)" >&2
  exit 1
fi
node scripts/translate-league-names.mjs "$LATEST"