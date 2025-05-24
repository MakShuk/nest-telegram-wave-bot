import { Controller, Get } from '@nestjs/common';
import { CustomLoggingService } from './logging.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly loggingService: CustomLoggingService) {}

  /**
   * Получает статистику производительности
   */
  @Get('performance')
  getPerformanceStats() {
    return this.loggingService.getPerformanceStats();
  }

  /**
   * Получает основную информацию о состоянии системы
   */
  @Get('health')
  getHealthStatus() {
    const stats = this.loggingService.getPerformanceStats();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      uptime: Math.floor(uptime),
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        used: Math.round(memoryUsage.rss / 1024 / 1024),
        heap: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      performance: {
        totalOperations: stats.totalOperations,
        averageDuration: Math.round(stats.averageDuration),
        slowOperations: stats.slowOperations,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Получает детальные логи производительности
   */
  @Get('performance/details')
  getDetailedPerformanceStats() {
    return this.loggingService.getPerformanceStats();
  }

  private formatUptime(uptime: number): string {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }
}