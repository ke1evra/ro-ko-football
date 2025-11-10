#!/bin/bash
# Скрипт для импорта базы данных из дампа на сервере.

# --- НАСТРОЙКИ ---
# Имя базы данных на сервере
REMOTE_DB_NAME="payload"
# Имя пользователя для доступа к базе
DB_USER="syncadmin"
# Пароль пользователя
DB_PASS="syncadminsyncadmin123qQ!"
# База данных для аутентификации
AUTH_DB="admin"
# Название папки с дампом
DUMP_FOLDER="dump"

echo "---[ Шаг 1/2: Восстановление базы данных '$REMOTE_DB_NAME' из дампа ]---"

# Проверка, что папка с дампом существует
if [ ! -d "$DUMP_FOLDER" ]; then
    echo "Ошибка: папка с дампом '$DUMP_FOLDER' не найдена. Убедитесь, что вы сначала запустили скрипт export-and-upload.sh на локальном компьютере."
    exit 1
fi

mongorestore --db $REMOTE_DB_NAME --username $DB_USER --password $DB_PASS --authenticationDatabase $AUTH_DB ./${DUMP_FOLDER}/$REMOTE_DB_NAME

# Проверка, что импорт прошел успешно
if [ $? -ne 0 ]; then
    echo "Ошибка: не удалось импортировать данные. Проверьте учетные данные и права доступа к базе."
    exit 1
fi

echo "---[ Шаг 2/2: Очистка ]---"
rm -rf ./$DUMP_FOLDER

echo "---"
echo "✅ Готово! База данных успешно восстановлена, временные файлы удалены."
