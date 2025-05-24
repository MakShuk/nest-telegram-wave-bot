import { CustomLoggingService } from './logging.service';

/**
 * Декоратор для автоматического измерения производительности методов
 * @param operationName - Название операции для метрик (необязательно)
 */
export function MeasurePerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const defaultOperationName = operationName || `${className}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Получаем экземпляр логгера через DI или глобальную переменную
        const loggingService: CustomLoggingService = this.loggingService || 
                                                     this.logger?.loggingService ||
                                                     global.loggingService;
        
        if (loggingService && typeof loggingService.recordPerformanceMetric === 'function') {
          loggingService.recordPerformanceMetric(defaultOperationName, duration, {
            args: args.length,
            success: true
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        const loggingService: CustomLoggingService = this.loggingService || 
                                                     this.logger?.loggingService ||
                                                     global.loggingService;
        
        if (loggingService && typeof loggingService.recordPerformanceMetric === 'function') {
          loggingService.recordPerformanceMetric(defaultOperationName, duration, {
            args: args.length,
            success: false,
            error: true,
            errorMessage: error.message
          });
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Декоратор для логирования вызовов методов
 * @param logLevel - Уровень логирования ('log', 'debug', 'verbose')
 */
export function LogMethodCall(logLevel: 'log' | 'debug' | 'verbose' = 'debug') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const loggingService: CustomLoggingService = this.loggingService || 
                                                   this.logger?.loggingService ||
                                                   global.loggingService;
      
      if (loggingService && typeof loggingService[logLevel] === 'function') {
        loggingService[logLevel](`Calling ${className}.${propertyName}`, {
          metadata: { 
            argsCount: args.length,
            className,
            methodName: propertyName
          }
        });
      }

      try {
        const result = await method.apply(this, args);
        
        if (loggingService && typeof loggingService[logLevel] === 'function') {
          loggingService[logLevel](`Completed ${className}.${propertyName}`, {
            metadata: { 
              success: true,
              className,
              methodName: propertyName
            }
          });
        }

        return result;
      } catch (error) {
        if (loggingService && typeof loggingService.error === 'function') {
          loggingService.error(
            `Error in ${className}.${propertyName}: ${error.message}`,
            error.stack,
            {
              metadata: { 
                success: false,
                className,
                methodName: propertyName,
                errorMessage: error.message
              }
            }
          );
        }

        throw error;
      }
    };

    return descriptor;
  };
}