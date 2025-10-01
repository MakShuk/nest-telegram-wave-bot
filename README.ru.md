# Nest Telegram Wave Bot

<p align="right">
  <a href="README.md"><img src="https://img.shields.io/badge/English-blue?style=for-the-badge&logo=github" alt="English"></a>
</p>

Telegram бот, построенный на фреймворке NestJS для отправки запланированных уведомлений и управления интервальными задачами.

![Лицензия](https://img.shields.io/badge/license-MIT-blue)
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)

## Оглавление
- [Требования](#требования)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [Docker](#docker)
- [Лицензия](#лицензия)

## Требования

- Node.js 16+
- npm или yarn
- Docker (опционально)
- Токен Telegram бота

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/nest-telegram-wave-bot.git
cd nest-telegram-wave-bot
```

2. Установите зависимости:
```bash
npm install
```

## Конфигурация

1. Создайте файл окружения из примера:
```bash
cp envs/.env.example .env
```

2. Настройте переменные окружения в файле `.env` (для production используйте .env.production):
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_MAIN_USER=ваш_chat_id
PORT=3000
NODE_ENV=development
LOG_LEVEL=log
# Опционально: TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook
```

## Использование

Запуск приложения в режиме разработки:
```bash
npm run start:dev
```

Или сборка и запуск в production режиме:
```bash
npm run build
npm run start:prod
```

## Docker

Сборка и запуск с использованием Docker Compose (для production создайте envs/.env.production):
```bash
docker-compose up -d
```

## Лицензия

Этот проект распространяется под лицензией UNLICENSED.