import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { getConfigModuleOptions } from 'src/configs/config/config.module';
import { TelegramModule } from 'src/configs/telegram.config';
import { TelegramActionsModule } from './telegram-actions/telegram-actions.module';
import { TelegramActionsService } from './telegram-actions/telegram-actions.service';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [ConfigModule.forRoot(getConfigModuleOptions()), TelegramModule.forRootAsync(), TelegramActionsModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService, TelegramActionsService],
})
export class AppModule { }