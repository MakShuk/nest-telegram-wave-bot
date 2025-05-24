import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: CustomLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, headers } = request;
    const startTime = Date.now();

    // Извлекаем пользовательский ID из заголовков или параметров, если доступен
    const userId = headers['x-user-id'] || request.query?.userId || request.body?.userId;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.loggingService.logHttpRequest(method, url, statusCode, duration, userId);
          this.loggingService.recordPerformanceMetric(`HTTP_${method}`, duration, {
            url,
            statusCode,
            userId
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.loggingService.error(
            `HTTP ${method} ${url} failed`,
            error.stack,
            {
              method,
              url,
              statusCode,
              duration,
              userId,
              error: error.message
            }
          );

          this.loggingService.recordPerformanceMetric(`HTTP_${method}`, duration, {
            url,
            statusCode,
            userId,
            error: true
          });
        }
      })
    );
  }
}