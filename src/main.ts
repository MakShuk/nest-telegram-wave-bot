import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

    // Запуск приложения без явного указания порта
    await app.init();

    // Расширенное логирование
    const logger = new Logger('Bootstrap');
    logger.log(`🚀 Application initialized successfully`);
    logger.log(`📝 Environment: ${environment}`);

    // НОВОЕ: Обработчики сигналов завершения
    const gracefulShutdown = (signal: string) => {
      logger.log(`🛑 Received ${signal}, starting graceful shutdown...`);
      app.close().then(() => {
        logger.log(`✅ Application closed gracefully`);
        process.exit(0);
      }).catch((error) => {
        logger.error(`❌ Error during shutdown: ${error.message}`);
        process.exit(1);
      });
    };

    // Перехват сигналов завершения
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    Logger.error(`❌ Error starting server: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
