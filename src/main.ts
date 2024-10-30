import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
    const port = configService.get<number>('PORT', 3000);
    const environment = configService.get<string>('NODE_ENV', 'development');

    // Swagger документация (только для development)
    if (environment === 'development') {
      const config = new DocumentBuilder()
        .setTitle('API Documentation')
        .setVersion('1.0')
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
    }

    // Запуск приложения
    await app.listen(port);

    // Расширенное логирование
    const logger = new Logger('Bootstrap');
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📝 Environment: ${environment}`);
    if (environment === 'development') {
      logger.log(
        `📚 Swagger documentation available at: http://localhost:${port}/docs`,
      );
    }
  } catch (error) {
    Logger.error(`❌ Error starting server: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
