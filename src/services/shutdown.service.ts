import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { IntervalTaskService } from './interval-task.service';

@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(ShutdownService.name);

  constructor(
    private readonly intervalTaskService: IntervalTaskService,
  ) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`🛑 Application shutdown initiated by ${signal || 'unknown signal'}`);
    
    try {
      // 1. Остановка всех cron задач
      this.logger.log('⏹️ Stopping all interval tasks...');
      this.intervalTaskService.stopAllTasks();
      
      // 2. Ожидание завершения активных операций (если есть)
      this.logger.log('⏳ Waiting for active operations to complete...');
      await this.waitForActiveOperations();
      
      this.logger.log('✅ Graceful shutdown completed successfully');
    } catch (error) {
      this.logger.error(`❌ Error during graceful shutdown: ${error.message}`);
      throw error;
    }
  }

  private async waitForActiveOperations(): Promise<void> {
    // Здесь можно добавить логику ожидания завершения активных операций
    // Например, проверка очередей, активных HTTP запросов и т.д.
    return new Promise((resolve) => {
      setTimeout(resolve, 1000); // Даем 1 секунду на завершение
    });
  }
}