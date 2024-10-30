import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { Logger } from '@nestjs/common';

// Интерфейс конфигурации
interface TelegramConfig {
  botToken: string;
  mainUser: number;
}

// Константы
const TELEGRAM_BOT_INSTANCE = 'TELEGRAM_BOT_INSTANCE';
const ERROR_MESSAGES = {
  TOKEN_MISSING: 'TELEGRAM_BOT_TOKEN is not defined in the environment',
  ACCESS_DENIED: (userId: number) =>
    `Access denied. You are not registered in the system. Contact the administrator to provide this number: ${userId}`,
};

// Сервис для работы с Telegram
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly config: TelegramConfig) { }

  async createBot(): Promise<Telegraf> {
    const bot = new Telegraf(this.config.botToken);

    await this.setupErrorHandler(bot);
    await this.setupAuthMiddleware(bot);
    await this.startBot(bot);
    return bot;
  }

  private async setupErrorHandler(bot: Telegraf): Promise<void> {
    bot.catch((err: Error, ctx: Context) => {
      this.logger.error(
        `Error in ${ctx.updateType}: ${err.message}`,
        err.stack,
      );
    });
  }

  private async setupAuthMiddleware(bot: Telegraf): Promise<void> {
    bot.use(async (ctx: Context, next: () => Promise<void>) => {
      const userId = ctx.from?.id;
      if (!userId || userId !== Number(this.config.mainUser)) {
        await ctx.reply(ERROR_MESSAGES.ACCESS_DENIED(userId));
        return;
      }

      return next();
    });
  }

  private async startBot(bot: Telegraf): Promise<void> {
    try {
      bot.launch();
      this.logger.log('Telegram bot successfully started');
    } catch (error) {
      this.logger.error('Failed to start Telegram bot', error);
      throw error;
    }
  }
}

// Factory для создания конфигурации
const createTelegramConfig = (configService: ConfigService): TelegramConfig => {
  const botToken = configService.get<string>('TELEGRAM_BOT_TOKEN');
  const mainUser = configService.get<number>('TELEGRAM_MAIN_USER');

  if (!botToken) {
    throw new Error(ERROR_MESSAGES.TOKEN_MISSING);
  }
  return { botToken, mainUser };
};

// Provider для бота
const TelegramBotProvider: Provider = {
  provide: TELEGRAM_BOT_INSTANCE,
  useFactory: async (configService: ConfigService) => {
    const config = createTelegramConfig(configService);
    const telegramService = new TelegramService(config);
    return telegramService.createBot();
  },
  inject: [ConfigService],
};

@Global()
@Module({})
export class TelegramModule {
  static forRootAsync(): DynamicModule {
    return {
      module: TelegramModule,
      imports: [ConfigModule],
      providers: [TelegramBotProvider],
      exports: [TELEGRAM_BOT_INSTANCE],
    };
  }
}
