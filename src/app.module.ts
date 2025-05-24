import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { getConfigModuleOptions } from 'src/configs/config/config.module';
import { TelegramModule } from 'src/configs/telegram.config';
import { TelegramActionsModule } from './telegram-actions/telegram-actions.module';
import { NotificationModule } from './notification/notification.module';
import { ShutdownService } from './services/shutdown.service';
import { IntervalTaskService } from './services/interval-task.service';
import { LoggingModule } from './common/logging.module';
import { LoggingInterceptor } from './common/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot(getConfigModuleOptions()),
    LoggingModule,
    TelegramModule.forRootAsync(),
    TelegramActionsModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    IntervalTaskService,
    ShutdownService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }