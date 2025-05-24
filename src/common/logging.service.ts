import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
  userId?: string;
  chatId?: string;
  command?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  trace?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  context?: Record<string, any>;
}

@Injectable()
export class CustomLoggingService implements LoggerService {
  private readonly logLevel: LogLevel;
  private readonly performanceMetrics: PerformanceMetric[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get<LogLevel>('LOG_LEVEL', 'log');
  }

  log(message: string, context?: LogContext): void {
    this.writeLog('LOG', message, context);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.writeLog('ERROR', message, { ...context, trace });
  }

  warn(message: string, context?: LogContext): void {
    this.writeLog('WARN', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.writeLog('DEBUG', message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.writeLog('VERBOSE', message, context);
  }

  /**
   * Логирует Telegram команду
   */
  logTelegramCommand(command: string, userId: string, chatId: string, success: boolean = true): void {
    this.log(`Telegram command executed: ${command}`, {
      command,
      userId,
      chatId,
      metadata: { success }
    });
  }

  /**
   * Логирует уведомление
   */
  logNotification(type: string, chatId: string, success: boolean = true, error?: Error): void {
    if (success) {
      this.log(`Notification sent: ${type}`, {
        chatId,
        metadata: { type, success }
      });
    } else {
      this.error(`Notification failed: ${type}`, error?.stack, {
        chatId,
        metadata: { type, success },
        error
      });
    }
  }

  /**
   * Логирует HTTP запрос
   */
  logHttpRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    this.log(`HTTP ${method} ${url} - ${statusCode}`, {
      method,
      url,
      statusCode,
      duration,
      userId
    });
  }

  /**
   * Записывает метрику производительности
   */
  recordPerformanceMetric(operation: string, duration: number, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      context
    };

    this.performanceMetrics.push(metric);

    // Ограничиваем размер массива метрик
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.shift();
    }

    // Логируем медленные операции
    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation}`, {
        duration,
        metadata: context
      });
    }
  }

  /**
   * Получает статистику производительности
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    slowOperations: number;
    recentOperations: PerformanceMetric[];
  } {
    const recent = this.performanceMetrics.slice(-100);
    const totalDuration = this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const slowOperations = this.performanceMetrics.filter(metric => metric.duration > 1000).length;

    return {
      totalOperations: this.performanceMetrics.length,
      averageDuration: this.performanceMetrics.length > 0 ? totalDuration / this.performanceMetrics.length : 0,
      slowOperations,
      recentOperations: recent
    };
  }

  /**
   * Создает декоратор для измерения времени выполнения методов
   */
  createPerformanceDecorator() {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        try {
          const result = await method.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Получаем экземпляр логгера через DI
          const loggingService = this.loggingService || global.loggingService;
          if (loggingService) {
            loggingService.recordPerformanceMetric(
              `${target.constructor.name}.${propertyName}`,
              duration,
              { args: args.length }
            );
          }

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          const loggingService = this.loggingService || global.loggingService;
          if (loggingService) {
            loggingService.recordPerformanceMetric(
              `${target.constructor.name}.${propertyName}`,
              duration,
              { args: args.length, error: true }
            );
          }

          throw error;
        }
      };
    };
  }

  private writeLog(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };

    // В продакшене можно добавить отправку в внешние системы мониторинга
    if (this.configService.get('NODE_ENV') === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // В разработке - более читаемый формат
      const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
      console.log(`[${timestamp}] [${level}] ${message}${contextStr}`);
    }
  }
}