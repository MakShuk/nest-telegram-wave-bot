import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as chalk from 'chalk';
import * as util from 'util';

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
    const icon = success ? '✅' : '❌';
    const action = success ? 'выполнена' : 'не выполнена';
    this.log(`${icon} Telegram команда /${command} ${action}`, {
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
      this.log(`📨 Уведомление отправлено: ${type}`, {
        chatId,
        metadata: { type, success }
      });
    } else {
      this.error(`📭 Ошибка отправки уведомления: ${type}`, error?.stack, {
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
    const statusIcon = statusCode < 400 ? '✅' : '❌';
    this.log(`${statusIcon} HTTP запрос: ${method} ${url}`, {
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
      this.warn(`🐌 Обнаружена медленная операция: ${operation}`, {
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
    const timestamp = new Date().toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };

    // В продакшене можно добавить отправку в внешние системы мониторинга
    if (this.configService.get('NODE_ENV') === 'production') {
      // Красивый JSON для продакшена
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      // В разработке - красивый цветной формат
      this.printPrettyLog(level, timestamp, message, context);
    }
  }

  /**
   * Форматирует и выводит красивый лог в консоль
   */
  private printPrettyLog(level: string, timestamp: string, message: string, context?: LogContext): void {
    // Выбираем цвет и иконку в зависимости от уровня
    let levelFormatted: string;
    let messageColor: chalk.Chalk;
    
    switch (level) {
      case 'ERROR':
        levelFormatted = chalk.bgRed.white.bold(` ❌ ${level} `);
        messageColor = chalk.red;
        break;
      case 'WARN':
        levelFormatted = chalk.bgYellow.black.bold(` ⚠️  ${level}  `);
        messageColor = chalk.yellow;
        break;
      case 'LOG':
        levelFormatted = chalk.bgGreen.white.bold(` ✅ ${level}  `);
        messageColor = chalk.green;
        break;
      case 'DEBUG':
        levelFormatted = chalk.bgBlue.white.bold(` 🔍 ${level} `);
        messageColor = chalk.blue;
        break;
      case 'VERBOSE':
        levelFormatted = chalk.bgMagenta.white.bold(` 📝 ${level} `);
        messageColor = chalk.magenta;
        break;
      default:
        levelFormatted = chalk.bgGray.white.bold(` ${level} `);
        messageColor = chalk.white;
    }

    // Форматируем timestamp
    const timeFormatted = chalk.gray(`[${timestamp}]`);
    
    // Основное сообщение
    const messageFormatted = messageColor.bold(message);

    // Выводим основную строку лога
    console.log(`${timeFormatted} ${levelFormatted} ${messageFormatted}`);

    // Если есть контекст, выводим его красиво
    if (context && Object.keys(context).length > 0) {
      this.printContext(context, level);
    }

    // Добавляем разделитель для лучшей читаемости
    if (level === 'ERROR' || (context && (context.error || context.trace))) {
      console.log(chalk.gray('─'.repeat(80)));
    }
  }

  /**
   * Красиво выводит контекст лога
   */
  private printContext(context: LogContext, level: string): void {
    const indent = '  ';
    
    // Основная информация
    if (context.userId) {
      console.log(`${indent}${chalk.cyan('👤 User ID:')} ${chalk.white(context.userId)}`);
    }
    if (context.chatId) {
      console.log(`${indent}${chalk.cyan('💬 Chat ID:')} ${chalk.white(context.chatId)}`);
    }
    if (context.command) {
      console.log(`${indent}${chalk.cyan('🎯 Command:')} ${chalk.white(context.command)}`);
    }
    
    // HTTP информация
    if (context.method || context.url) {
      const method = context.method ? chalk.yellow(context.method) : '';
      const url = context.url ? chalk.white(context.url) : '';
      console.log(`${indent}${chalk.cyan('🌐 Request:')} ${method} ${url}`);
    }
    if (context.statusCode) {
      const statusColor = context.statusCode < 400 ? chalk.green : chalk.red;
      console.log(`${indent}${chalk.cyan('📊 Status:')} ${statusColor(context.statusCode.toString())}`);
    }
    if (context.duration !== undefined) {
      const durationColor = context.duration > 1000 ? chalk.red : 
                           context.duration > 500 ? chalk.yellow : chalk.green;
      console.log(`${indent}${chalk.cyan('⏱️  Duration:')} ${durationColor(`${context.duration}ms`)}`);
    }

    // Метаданные
    if (context.metadata && Object.keys(context.metadata).length > 0) {
      console.log(`${indent}${chalk.cyan('📦 Metadata:')}`);
      const formatted = util.inspect(context.metadata, {
        colors: true,
        depth: 3,
        compact: false,
        breakLength: 60
      });
      // Добавляем отступ к каждой строке метаданных
      const indentedMetadata = formatted.split('\n').map(line => `${indent}${indent}${line}`).join('\n');
      console.log(indentedMetadata);
    }

    // Ошибки
    if (context.error) {
      console.log(`${indent}${chalk.red.bold('❌ Error:')}`);
      const errorStr = typeof context.error === 'string' ? context.error : context.error.message;
      console.log(`${indent}${indent}${chalk.red(errorStr)}`);
    }
    if (context.trace) {
      console.log(`${indent}${chalk.red.bold('📚 Stack Trace:')}`);
      const stackLines = context.trace.split('\n').slice(0, 5); // Показываем первые 5 строк стека
      stackLines.forEach(line => {
        console.log(`${indent}${indent}${chalk.red.dim(line.trim())}`);
      });
    }
  }
}