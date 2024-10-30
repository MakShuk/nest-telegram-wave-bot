import { Controller, Post, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Post('start')
  @ApiOperation({
    summary: 'Запуск уведомлений',
    description: 'Запускает сервис периодических уведомлений'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Уведомления успешно запущены',
    type: NotificationResponseDto
  })
  @ApiInternalServerErrorResponse({
    description: 'Внутренняя ошибка сервера при запуске уведомлений',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Failed to start notification service' }
      }
    }
  })
  async startNotification(): Promise<NotificationResponseDto> {
    this.notificationService.startNotification(() => console.log('test'));

    return {
      success: true,
      message: 'Notification service started successfully',
      startedAt: new Date().toISOString()
    };
  }
}
