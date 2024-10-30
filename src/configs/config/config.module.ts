import { ConfigModuleOptions } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { ENV_VALUES } from './constants';

export function getConfigModuleOptions(): ConfigModuleOptions {
  const nodeEnv = process.env.NODE_ENV || ENV_VALUES.DEFAULT_VALUES.NODE_ENV;

  return {
    isGlobal: true,
    validationSchema: configValidationSchema,
    envFilePath: `envs/.env.${nodeEnv}`,
    cache: true,
    expandVariables: true,
  };
}
