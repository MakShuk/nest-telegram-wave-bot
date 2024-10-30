import { Inject, Injectable, Logger } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

/** Функция обратного вызова для обработки сообщений */
type MessageCallback = (ctx: Context) => Promise<void>;
/** Обработчик сообщений */
type MessageHandler = (callback: MessageCallback) => void;

/** Интерфейс для деталей ошибки */
interface ErrorDetails {
  /** Название метода, где произошла ошибка */
  method: string;
  /** Объект ошибки */
  error: Error;
  /** Контекст выполнения */
  context?: any;
}

/**
 * Сервис для работы с Telegram ботом через Telegraf
 * @class TelegrafService
 */
@Injectable()
export class TelegramActionsService {
  private readonly logger = new Logger(TelegramActionsService.name);

  /**
   * @param bot - Экземпляр Telegram бота
   */
  constructor(
    @Inject('TELEGRAM_BOT_INSTANCE')
    private readonly bot: Telegraf<Context>,
  ) {
    this.setupErrorHandler();
  }

  /**
   * Обрабатывает ошибки, возникающие в сервисе
   * @param details - Детали ошибки
   * @private
   */
  private handleError(details: ErrorDetails): void {
    const { method, error, context } = details;
    this.logger.error(
      `Error in ${method}: ${error.message}`,
      error.stack,
      context,
    );
  }

  /**
   * Настраивает глобальный обработчик ошибок для бота
   * @private
   */
  private setupErrorHandler(): void {
    this.bot.catch((error: Error, ctx: Context) => {
      this.handleError({
        method: 'global',
        error,
        context: ctx.update,
      });
    });
  }

  /**
   * Выполняет обработчик сообщений с обработкой ошибок
   * @param method - Название метода
   * @param callback - Функция обратного вызова
   * @param ctx - Контекст Telegram
   * @private
   */
  private async executeHandler(
    method: string,
    callback: MessageCallback,
    ctx: Context,
  ): Promise<void> {
    try {
      this.logger.debug(`Executing ${method}`);
      await callback(ctx);
    } catch (error) {
      this.handleError({
        method,
        error: error as Error,
        context: ctx.update,
      });
      throw error;
    }
  }

  /**
   * Создает команду бота с проверкой валидности
   * @param command - Название команды
   * @param callback - Обработчик команды
   * @throws {Error} Если команда пустая
   */
  public createCommand(command: string, callback: MessageCallback): void {
    if (!command?.trim()) {
      throw new Error('Command cannot be empty');
    }

    this.bot.command(command, (ctx) =>
      this.executeHandler('command:' + command, callback, ctx),
    );
  }

  /**
   * Создает обработчик для определенного типа сообщений
   * @param type - Тип сообщения
   * @returns Функция-обработчик для данного типа сообщений
   * @private
   */
  private createMessageHandler(type: string): MessageHandler {
    return (callback: MessageCallback) => {
      this.bot.on(message(type as any), (ctx) =>
        this.executeHandler(`message:${type}`, callback, ctx),
      );
    };
  }

  /** Обработчик текстовых сообщений */
  public readonly textMessage = this.createMessageHandler('text');
  /** Обработчик голосовых сообщений */
  public readonly voiceMessage = this.createMessageHandler('voice');
  /** Обработчик изображений */
  public readonly imageMessage = this.createMessageHandler('photo');
  /** Обработчик файлов */
  public readonly fileMessage = this.createMessageHandler('document');

  /**
   * Создает обработчик для действий кнопок
   * @param action - Идентификатор действия (строка или регулярное выражение)
   * @param callback - Обработчик действия
   * @throws {Error} Если action пустой (для строковых значений)
   */
  public async buttonAction(
    action: string | RegExp,
    callback: MessageCallback,
  ): Promise<void> {
    if (typeof action === 'string' && !action?.trim()) {
      throw new Error('Action cannot be empty');
    }

    this.bot.action(action, (ctx) =>
      this.executeHandler('button:' + action.toString(), callback, ctx),
    );
  }
}
