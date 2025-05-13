# Nest Telegram Wave Bot

<p align="right">
  <a href="README.ru.md"><img src="https://img.shields.io/badge/Русский-red?style=for-the-badge&logo=github" alt="Русский"></a>
</p>

A Telegram bot built with NestJS framework for sending scheduled notifications and managing interval tasks.

![License](https://img.shields.io/badge/license-MIT-blue)
![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)

## Table of Contents
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Docker](#docker)
- [License](#license)

## Requirements

- Node.js 16+
- npm or yarn
- Docker (optional)
- Telegram Bot Token

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nest-telegram-wave-bot.git
cd nest-telegram-wave-bot
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create environment file from example:
```bash
cp envs/.env.development .env
```

2. Configure your environment variables in `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
```

## Usage

Start the application in development mode:
```bash
npm run start:dev
```

Or build and run in production:
```bash
npm run build
npm run start:prod
```

## Docker

Build and run using Docker Compose:
```bash
docker-compose up -d
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.