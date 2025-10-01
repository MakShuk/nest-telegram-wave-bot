import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as chalk from 'chalk';

async function bootstrap() {
  try {
    // Настройка уровней логирования
    const logLevels: LogLevel[] =
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn', 'log', 'debug'];

    // Создание приложения с расширенной конфигурацией
    const app = await NestFactory.create(AppModule, {
      // Настройка уровней логирования в соответствии с окружением
      logger: logLevels,
      // Включение CORS для обработки кросс-доменных запросов
      cors: true,
      // Буферизация логов для оптимизации производительности
      bufferLogs: true,
    });

    // Получение ConfigService для доступа к переменным окружения
    const configService = app.get(ConfigService);
    const environment = configService.get<string>('NODE_ENV', 'development');

    // НОВОЕ: Включаем graceful shutdown hooks
    app.enableShutdownHooks();

    // Запуск приложения с прослушиванием порта для healthcheck
    const port = configService.get<number>('PORT', 3000);
    await app.listen(port);

    // Расширенное логирование
    const logger = new Logger('Bootstrap');
    console.log('\n' + '═'.repeat(80));
    logger.log(`🚀 Приложение успешно инициализировано`);
    logger.log(`📝 Окружение: ${chalk.cyan(environment)}`);
    logger.log(`🌐 HTTP сервер запущен на порту: ${chalk.green(port)}`);
    logger.log(`🤖 Telegram бот запущен и готов к работе`);
    console.log('═'.repeat(80) + '\n');

    // НОВОЕ: Обработчики сигналов завершения
    const gracefulShutdown = (signal: string) => {
      console.log('\n' + '═'.repeat(80));
      logger.log(`🛑 Получен сигнал ${chalk.yellow(signal)}, начинаем корректное завершение...`);
      app.close().then(() => {
        logger.log(`✅ Приложение успешно остановлено`);
        console.log('═'.repeat(80) + '\n');
        process.exit(0);
      }).catch((error) => {
        logger.error(`❌ Ошибка при завершении: ${error.message}`);
        console.log('═'.repeat(80) + '\n');
        process.exit(1);
      });
    };

    // Перехват сигналов завершения
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.log('\n' + '═'.repeat(80));
    Logger.error(`❌ Ошибка запуска сервера: ${error.message}`, error.stack);
    console.log('═'.repeat(80) + '\n');
    process.exit(1);
  }
}

bootstrap();
