import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { TelegramActionsService } from './telegram-actions/telegram-actions.service';
import { NotificationService } from './notification/notification.service';
import { Context, Markup } from 'telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class AppService implements OnModuleInit {
  private lastMessageId: number | null = null;

  constructor(
    private readonly telegramActionsService: TelegramActionsService,
    private readonly notificationService: NotificationService,
    @Inject('TELEGRAM_BOT_INSTANCE')
    private readonly bot: Telegraf<Context>,
  ) {}
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

  async onModuleInit() {
    this.telegramActionsService.createCommand('start', async (ctx) => {
      const time5Min = Markup.button.callback(`5 минут`, 'time5Min');
      const time3Min = Markup.button.callback(`3 минуты`, 'time3Min');
      const time10Min = Markup.button.callback(`10 минут`, 'time10Min');
      const time15Min = Markup.button.callback(`15 минут`, 'time15Min');
      const stop = Markup.button.callback(`Остановить`, 'stop');
      await ctx.reply(
        `Интервал запуска уведомлений`,
        Markup.inlineKeyboard(
          [time3Min, time5Min, time10Min, time15Min, stop],
          { columns: 2 },
        ),
      );
    });

    this.telegramActionsService.buttonAction('time3Min', async (ctx) => {
      this.notificationService.stopNotification();
      this.notificationService.startNotification(
        () => this.sendNotification('Меняй'),
        3,
      );
      ctx.reply('Уведомления запущены с интервалом 3 минуты');
    });

    this.telegramActionsService.buttonAction('time5Min', async (ctx) => {
      this.notificationService.stopNotification();
      this.notificationService.startNotification(
        () => this.sendNotification('Меняй'),
        5,
      );
      ctx.reply('Уведомления запущены с интервалом 5 минут');
    });

    this.telegramActionsService.buttonAction('time10Min', async (ctx) => {
      this.notificationService.stopNotification();
      this.notificationService.startNotification(
        () => this.sendNotification('Меняй'),
        10,
      );
      ctx.reply('Уведомления запущены с интервалом 10 минут');
    });

    this.telegramActionsService.buttonAction('time15Min', async (ctx) => {
      this.notificationService.stopNotification();
      this.notificationService.startNotification(
        () => this.sendNotification('Меняй'),
        15,
      );
      ctx.reply('Уведомления запущены с интервалом 15 минут');
    });

    this.telegramActionsService.buttonAction('stop', async (ctx) => {
      this.notificationService.stopNotification();
      ctx.reply('Уведомления остановлены');
    });
  }
}
