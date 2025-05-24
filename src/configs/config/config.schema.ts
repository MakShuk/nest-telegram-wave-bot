import * as Joi from 'joi';
import { ENV_VALUES } from './constants';

export const configValidationSchema = Joi.object({
  PORT: Joi.number()
    .port()
    .default(ENV_VALUES.DEFAULT_VALUES.PORT)
    .description('Application port number'),

  NODE_ENV: Joi.string()
    .valid(...Object.values(ENV_VALUES.NODE_ENVIRONMENTS))
    .default(ENV_VALUES.DEFAULT_VALUES.NODE_ENV)
    .description('Node environment'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('log')
    .description('Application logging level'),

  TELEGRAM_MAIN_USER: Joi.string()
    .required()
    .description('Main Telegram user identifier'),
});
