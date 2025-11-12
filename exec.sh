
#!/bin/bash
# Универсальный скрипт для выполнения команд внутри Docker-контейнера 'app'.

# Проверяем, что команда была передана
if [ -z "$1" ]; then
    echo "Ошибка: Укажите команду, которую нужно выполнить."
    echo "Пример: ./exec.sh pnpm run matches:import:forward"
    exit 1
fi

# Выполняем команду внутри контейнера
docker compose exec app "$@"
