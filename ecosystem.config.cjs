/**
 * PM2 Ecosystem Configuration для Football Fan Platform
 *
 * Конфигурация для запуска Next.js приложения с Payload CMS и MongoDB
 * в продакшн окружении с помощью PM2.
 *
 * Использование:
 * - Запуск: pm2 start ecosystem.config.cjs
 * - Остановка: pm2 stop ecosystem.config.cjs
 * - Перезапуск: pm2 restart ecosystem.config.cjs
 * - Мониторинг: pm2 monit
 * - Логи: pm2 logs
 */

module.exports = {
  apps: [
    {
      // Основное приложение Next.js
      name: 'football-platform',
      script: 'node',
      args: 'server.js',
      cwd: '.next/standalone',
      instances: 1,
      exec_mode: 'fork',

      // Переменные окружения
      env: {
        NODE_ENV: 'production',
        PORT: 4317,
        HOST: '0.0.0.0',
        HOSTNAME: '0.0.0.0',
        NODE_OPTIONS: '--no-deprecation',
        // Базовые переменные (остальные из .env файла)
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_SITE_URL: 'https://rocoscore.ru',
      },

      // Настройки автоперезапуска
      watch: false, // В продакшене не следим за файлами
      ignore_watch: ['node_modules', '.next', 'logs', 'media'],
      max_memory_restart: '1G', // Перезапуск при превышении 1GB памяти

      // Логирование
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Настройки перезапуска
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Healthcheck
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Дополнительные настройки
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
    },
  ],

  // Настройки деплоя (опционально)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/payload-starter.git',
      path: '/var/www/football-platform',

      // Команды для деплоя
      'pre-deploy-local': '',
      'post-deploy':
        'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',

      // Переменные окружения для деплоя
      env: {
        NODE_ENV: 'production',
        PORT: 4317,
        HOST: '0.0.0.0',
      },
    },

    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/payload-starter.git',
      path: '/var/www/football-platform-staging',

      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env staging',

      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
    },
  },
}
