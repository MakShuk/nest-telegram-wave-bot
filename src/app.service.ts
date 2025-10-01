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
  private botMessageIds: number[] = [];
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
            stopped: 'Уведомления остановлены',
            doubleMode: 'Двойной режим',
            doubleModeEnabled: '✅ Вкл.',
            doubleModeDisabled: '❌ Выкл.',
            secondNotification: 'Повтор'
          },
          doubleNotificationMode: {
            enabled: false,
            delayMinutes: 1
          }
        }
      };
    }
  }

  private saveConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('Ошибка при сохранении конфигурации:', error);
    }
  }
  getStatus(): string {
    return 'OK';
  }

  private async clearAllBotMessages(): Promise<void> {
    const userId = process.env.TELEGRAM_MAIN_USER;

    // Удаляем все сохраненные сообщения бота
    for (const messageId of this.botMessageIds) {
      try {
        await this.bot.telegram.deleteMessage(userId, messageId);
      } catch (deleteError) {
        // Игнорируем ошибку, если сообщение уже было удалено (код 400)
        if (deleteError?.response?.error_code !== 400) {
          console.error(`Ошибка при удалении сообщения ${messageId}:`, deleteError);
        }
      }
    }

    // Очищаем массив ID сообщений
    this.botMessageIds = [];
    this.lastMessageId = null;
  }

  async sendNotification(message: string): Promise<void> {
    try {
      // Удаляем предыдущее сообщение, если оно существует
      if (this.lastMessageId) {
        try {
          await this.bot.telegram.deleteMessage(process.env.TELEGRAM_MAIN_USER, this.lastMessageId);
          // Удаляем из массива botMessageIds, если оно там есть
          const index = this.botMessageIds.indexOf(this.lastMessageId);
          if (index > -1) {
            this.botMessageIds.splice(index, 1);
          }
        } catch (deleteError) {
          // Игнорируем ошибку, если сообщение уже было удалено
          if (deleteError?.response?.error_code !== 400) {
            console.error('Ошибка при удалении предыдущего сообщения:', deleteError);
          }
        }
      }

      // Отправляем новое сообщение и сохраняем его ID
      const newMessage = await this.bot.telegram.sendMessage(process.env.TELEGRAM_MAIN_USER, message);
      this.lastMessageId = newMessage.message_id;
      this.botMessageIds.push(newMessage.message_id);
    } catch (error) {
      console.error('Ошибка при отправке уведомления в Telegram:', error);
      throw error;
    }
  }

  async sendSecondNotification(message: string): Promise<void> {
    try {
      // Отправляем второе уведомление с кнопкой "Остановить"
      const messages = this.config.timers.messages;
      const stopButton = Markup.button.callback(messages.stop, 'stop_from_notification');

      const newMessage = await this.bot.telegram.sendMessage(
        process.env.TELEGRAM_MAIN_USER,
        message,
        Markup.inlineKeyboard([stopButton])
      );
      this.botMessageIds.push(newMessage.message_id);
    } catch (error) {
      console.error('Ошибка при отправке второго уведомления в Telegram:', error);
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

    // Устанавливаем функцию для второго уведомления
    this.notificationService.setSecondNotificationFunc(
      () => this.sendSecondNotification(messages.secondNotification)
    );

    // Отвечаем на callback query, чтобы убрать "часы" на кнопке
    await ctx.answerCbQuery(`Запущен интервал ${interval.label}`);

    // Удаляем предыдущие сообщения-подтверждения (кроме стартового меню)
    const confirmationMessages = this.botMessageIds.filter(id => id !== this.lastMessageId);
    for (const msgId of confirmationMessages) {
      try {
        await this.bot.telegram.deleteMessage(process.env.TELEGRAM_MAIN_USER, msgId);
      } catch (deleteError) {
        if (deleteError?.response?.error_code !== 400) {
          console.error(`Ошибка при удалении сообщения ${msgId}:`, deleteError);
        }
      }
    }

    // Отправляем одно подтверждающее сообщение
    const doubleModeStatus = this.notificationService.isDoubleNotificationEnabled()
      ? '(двойной режим включен)'
      : '';
    const replyMessage = await ctx.reply(`✅ Уведомления запущены с интервалом ${interval.label} ${doubleModeStatus}`);
    this.botMessageIds = [replyMessage.message_id];
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

    // Устанавливаем начальное состояние режима двойных уведомлений из конфигурации
    if (this.config.timers.doubleNotificationMode?.enabled) {
      this.notificationService.enableDoubleNotification(true);
    }

    this.telegramActionsService.createCommand('start', async (ctx) => {
      // Очищаем все предыдущие сообщения бота
      await this.clearAllBotMessages();

      // Создаем кнопки для всех интервалов из конфигурации
      const timerButtons = intervals.map((interval: any) =>
        Markup.button.callback(interval.buttonText, interval.id)
      );

      // Добавляем кнопку двойного режима
      const doubleModeText = this.notificationService.isDoubleNotificationEnabled()
        ? messages.doubleModeEnabled
        : messages.doubleModeDisabled;
      const doubleModeButton = Markup.button.callback(doubleModeText, 'toggle_double_mode');

      // Добавляем кнопку остановки
      const stopButton = Markup.button.callback(messages.stop, 'stop');
      const allButtons = [...timerButtons, doubleModeButton, stopButton];

      const startMessage = await ctx.reply(
        messages.start,
        Markup.inlineKeyboard(allButtons, { columns: 2 }),
      );
      this.botMessageIds.push(startMessage.message_id);
    });

    this.setupTimerButtons();

    // Обработчик переключения режима двойных уведомлений
    this.telegramActionsService.buttonAction('toggle_double_mode', async (ctx) => {
      const currentState = this.notificationService.isDoubleNotificationEnabled();
      const newState = !currentState;

      // Переключаем состояние
      this.notificationService.enableDoubleNotification(newState);

      // Сохраняем в конфигурацию
      this.config.timers.doubleNotificationMode.enabled = newState;
      this.saveConfig();

      // Отвечаем на callback query
      const statusMessage = newState ? messages.doubleModeEnabled : messages.doubleModeDisabled;
      await ctx.answerCbQuery(statusMessage);

      // Обновляем меню с новым статусом кнопки
      const timerButtons = intervals.map((interval: any) =>
        Markup.button.callback(interval.buttonText, interval.id)
      );

      const doubleModeText = newState ? messages.doubleModeEnabled : messages.doubleModeDisabled;
      const doubleModeButton = Markup.button.callback(doubleModeText, 'toggle_double_mode');
      const stopButton = Markup.button.callback(messages.stop, 'stop');
      const allButtons = [...timerButtons, doubleModeButton, stopButton];

      // Удаляем старое меню и создаем новое
      await this.clearAllBotMessages();
      const newStartMessage = await ctx.reply(
        messages.start,
        Markup.inlineKeyboard(allButtons, { columns: 2 }),
      );
      this.botMessageIds.push(newStartMessage.message_id);
    });

    this.telegramActionsService.buttonAction('stop', async (ctx) => {
      // Отвечаем на callback query
      await ctx.answerCbQuery('Уведомления остановлены');

      // Останавливаем уведомления
      this.notificationService.stopNotification();

      // Очищаем всю историю сообщений бота
      await this.clearAllBotMessages();

      // Заново показываем меню start
      const timerButtons = intervals.map((interval: any) =>
        Markup.button.callback(interval.buttonText, interval.id)
      );

      const doubleModeText = this.notificationService.isDoubleNotificationEnabled()
        ? messages.doubleModeEnabled
        : messages.doubleModeDisabled;
      const doubleModeButton = Markup.button.callback(doubleModeText, 'toggle_double_mode');
      const stopButton = Markup.button.callback(messages.stop, 'stop');
      const allButtons = [...timerButtons, doubleModeButton, stopButton];

      const newStartMessage = await ctx.reply(
        messages.start,
        Markup.inlineKeyboard(allButtons, { columns: 2 }),
      );
      this.botMessageIds.push(newStartMessage.message_id);
    });

    // Обработчик для кнопки "Остановить" в сообщениях уведомлений
    this.telegramActionsService.buttonAction('stop_from_notification', async (ctx) => {
      // Отвечаем на callback query
      await ctx.answerCbQuery('Уведомления остановлены');

      // Останавливаем уведомления
      this.notificationService.stopNotification();

      // Очищаем всю историю сообщений бота
      await this.clearAllBotMessages();

      // Заново показываем меню start
      const timerButtons = intervals.map((interval: any) =>
        Markup.button.callback(interval.buttonText, interval.id)
      );

      const doubleModeText = this.notificationService.isDoubleNotificationEnabled()
        ? messages.doubleModeEnabled
        : messages.doubleModeDisabled;
      const doubleModeButton = Markup.button.callback(doubleModeText, 'toggle_double_mode');
      const stopButton = Markup.button.callback(messages.stop, 'stop');
      const allButtons = [...timerButtons, doubleModeButton, stopButton];

      const newStartMessage = await ctx.reply(
        messages.start,
        Markup.inlineKeyboard(allButtons, { columns: 2 }),
      );
      this.botMessageIds.push(newStartMessage.message_id);
    });
  }
}
