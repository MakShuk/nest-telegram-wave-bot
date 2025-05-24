import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { TelegramActionsService } from './telegram-actions/telegram-actions.service';
import { NotificationService } from './notification/notification.service';
import { Context, Markup } from 'telegraf';
import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService implements OnModuleInit {
  private lastMessageId: number | null = null;
  private config: any;

  constructor(
    private readonly telegramActionsService: TelegramActionsService,
    private readonly notificationService: NotificationService,
    @Inject('TELEGRAM_BOT_INSTANCE')
    private readonly bot: Telegraf<Context>,
  ) {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Ошибка при загрузке конфигурации:', error);
      // Fallback конфигурация
      this.config = {
        timers: {
          intervals: [
            { id: 'time3Min', value: 3, label: '3 минуты', buttonText: '3 минуты' },
            { id: 'time5Min', value: 5, label: '5 минут', buttonText: '5 минут' },
            { id: 'time10Min', value: 10, label: '10 минут', buttonText: '10 минут' },
            { id: 'time15Min', value: 15, label: '15 минут', buttonText: '15 минут' }
          ],
          messages: {
            notification: 'Меняй',
            start: 'Интервал запуска уведомлений',
            stop: 'Остановить',
            stopped: 'Уведомления остановлены'
          }
        }
      };
    }
  }
  getStatus(): string {
    return 'OK';
  }

  async sendNotification(message: string): Promise<void> {
    try {
      // Удаляем предыдущее сообщение, если оно существует
      if (this.lastMessageId) {
        try {
          await this.bot.telegram.deleteMessage(process.env.TELEGRAM_MAIN_USER, this.lastMessageId);
        } catch (deleteError) {
          console.error('Ошибка при удалении предыдущего сообщения:', deleteError);
        }
      }

      // Отправляем новое сообщение и сохраняем его ID
      const newMessage = await this.bot.telegram.sendMessage(process.env.TELEGRAM_MAIN_USER, message);
      this.lastMessageId = newMessage.message_id;
    } catch (error) {
      console.error('Ошибка при отправке уведомления в Telegram:', error);
      throw error;
    }
  }

  private async startTimerNotification(interval: any, ctx: Context): Promise<void> {
    const messages = this.config.timers.messages;

    this.notificationService.stopNotification();
    this.notificationService.startNotification(
      () => this.sendNotification(messages.notification),
      interval.value,
    );
    await ctx.reply(`Уведомления запущены с интервалом ${interval.label}`);
  }

  private setupTimerButtons(): void {
    const intervals = this.config.timers.intervals;

    intervals.forEach((interval: any) => {
      this.telegramActionsService.buttonAction(interval.id, async (ctx) => {
        await this.startTimerNotification(interval, ctx);
      });
    });
  }

  async onModuleInit() {
    const intervals = this.config.timers.intervals;
    const messages = this.config.timers.messages;

    this.telegramActionsService.createCommand('start', async (ctx) => {
      // Создаем кнопки для всех интервалов из конфигурации
      const timerButtons = intervals.map((interval: any) =>
        Markup.button.callback(interval.buttonText, interval.id)
      );
      
      // Добавляем кнопку остановки
      const stopButton = Markup.button.callback(messages.stop, 'stop');
      const allButtons = [...timerButtons, stopButton];
      
      await ctx.reply(
        messages.start,
        Markup.inlineKeyboard(allButtons, { columns: 2 }),
      );
    });

    this.setupTimerButtons();

    this.telegramActionsService.buttonAction('stop', async (ctx) => {
      this.notificationService.stopNotification();
      await ctx.reply(messages.stopped);
    });
  }
}
