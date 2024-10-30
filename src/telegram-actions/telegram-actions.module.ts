import { Module } from '@nestjs/common';
import { TelegramActionsService } from './telegram-actions.service';

@Module({
  providers: [TelegramActionsModule],
})
export class TelegramActionsModule {}
