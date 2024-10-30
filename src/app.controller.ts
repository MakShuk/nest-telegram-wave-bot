import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @ApiOperation({ summary: 'Get server status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the server status',
    type: String
  })
  @Get('status')
  getStatus(): string {
    return this.appService.getStatus();
  }

  @ApiOperation({ summary: 'Send a notification to Telegram' })
  @ApiResponse({
    status: 200,
    description: 'Sends a notification to Telegram',
    type: String
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to be sent',
          example: 'Hello, world!'
        }
      }
    }
  })
  @Post('send-notification')
  sendNotification(@Body() body: { message: string }): Promise<void> {
    return this.appService.sendNotification(body.message);
  }
}