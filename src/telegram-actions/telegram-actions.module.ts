import { Module } from '@nestjs/common';
import { TelegramActionsService } from './telegram-actions.service';

@Module({
  providers: [TelegramActionsService],
  exports: [TelegramActionsService],
})
export class TelegramActionsModule {}
