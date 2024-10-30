import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Статус операции',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Сообщение о результате операции',
    example: 'Notification service started successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Временная метка запуска',
    example: '2024-01-01T12:00:00.000Z'
  })
  startedAt: string;
} 