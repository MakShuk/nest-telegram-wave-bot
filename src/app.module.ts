import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { getConfigModuleOptions } from 'src/configs/config/config.module';
import { TelegramModule } from 'src/configs/telegram.config';
import { TelegramActionsModule } from './telegram-actions/telegram-actions.module';
import { NotificationModule } from './notification/notification.module';
import { ShutdownService } from './services/shutdown.service';
import { IntervalTaskService } from './services/interval-task.service';

@Module({
  imports: [ConfigModule.forRoot(getConfigModuleOptions()), TelegramModule.forRootAsync(), TelegramActionsModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService, IntervalTaskService, ShutdownService],
})
export class AppModule { }