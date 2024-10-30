import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { IntervalTaskService } from 'src/services/interval-task.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, IntervalTaskService],
  exports: [NotificationService]
})
export class NotificationModule {}
