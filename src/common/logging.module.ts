import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomLoggingService } from './logging.service';
import { LoggingInterceptor } from './logging.interceptor';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [CustomLoggingService, LoggingInterceptor],
  exports: [CustomLoggingService, LoggingInterceptor],
})
export class LoggingModule {}